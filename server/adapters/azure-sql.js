/**
 * Azure SQL Database adapter using mssql library
 */
import sql from "mssql";

export class AzureSQLAdapter {
  constructor(config) {
    this.config = config;
    this.pool = null;
    this.sqlConfig = {
      server: config.azureSql?.server || process.env.AZURE_SQL_SERVER,
      database: config.azureSql?.database || process.env.AZURE_SQL_DATABASE,
      user: config.azureSql?.user || process.env.AZURE_SQL_USER,
      password: config.azureSql?.password || process.env.AZURE_SQL_PASSWORD,
      port: parseInt(config.azureSql?.port || process.env.AZURE_SQL_PORT || "1433"),
      authentication: {
        type: "default",
      },
      options: {
        encrypt: true,
        trustServerCertificate: false,
        connectTimeout: 15000,
        requestTimeout: 30000,
      },
    };
  }

  async connect() {
    if (!this.sqlConfig.server || !this.sqlConfig.database || !this.sqlConfig.user || !this.sqlConfig.password) {
      console.warn("[db] Azure SQL configuration incomplete. Set AZURE_SQL_SERVER, AZURE_SQL_DATABASE, AZURE_SQL_USER, AZURE_SQL_PASSWORD");
      return false;
    }

    try {
      this.pool = new sql.ConnectionPool(this.sqlConfig);
      await this.pool.connect();

      // Create tables if they don't exist
      await this.createTables();

      console.log(`[db] Azure SQL connected → ${this.sqlConfig.server}/${this.sqlConfig.database}`);
      return true;
    } catch (err) {
      console.error(`[db] Azure SQL connection failed: ${err.message}`);
      return false;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.close();
      console.log("[db] Azure SQL disconnected");
    }
  }

  async createTables() {
    const request = this.pool.request();

    // Create enquiries table if it doesn't exist
    await request.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'enquiries')
      CREATE TABLE enquiries (
        _id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(120) NOT NULL,
        email NVARCHAR(254) NOT NULL,
        company NVARCHAR(160) DEFAULT '',
        budget NVARCHAR(60) DEFAULT '',
        message NVARCHAR(5000) NOT NULL,
        status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'failed')),
        mail_attempts INT DEFAULT 0,
        mail_lastAttemptAt DATETIME2 DEFAULT NULL,
        mail_nextAttemptAt DATETIME2 DEFAULT NULL,
        mail_notifiedAt DATETIME2 DEFAULT NULL,
        mail_messageId NVARCHAR(MAX) DEFAULT '',
        mail_lastError NVARCHAR(MAX) DEFAULT '',
        mail_autoReplySent BIT DEFAULT 0,
        meta_ip NVARCHAR(45) DEFAULT '',
        meta_userAgent NVARCHAR(400) DEFAULT '',
        meta_referer NVARCHAR(400) DEFAULT '',
        meta_source NVARCHAR(100) DEFAULT 'start-a-project',
        createdAt DATETIME2 DEFAULT GETUTCDATE(),
        updatedAt DATETIME2 DEFAULT GETUTCDATE()
      )
    `);

    // Create indexes
    await request.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_status')
      CREATE INDEX idx_status ON enquiries(status)
    `);

    await request.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_nextAttemptAt')
      CREATE INDEX idx_nextAttemptAt ON enquiries(mail_nextAttemptAt)
    `);

    await request.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_createdAt')
      CREATE INDEX idx_createdAt ON enquiries(createdAt DESC)
    `);
  }

  async createEnquiry(data) {
    const request = this.pool.request();

    const result = await request
      .input("name", sql.NVarChar(120), data.name)
      .input("email", sql.NVarChar(254), data.email.toLowerCase())
      .input("company", sql.NVarChar(160), data.company || "")
      .input("budget", sql.NVarChar(60), data.budget || "")
      .input("message", sql.NVarChar(5000), data.message)
      .input("meta_ip", sql.NVarChar(45), data.meta?.ip || "")
      .input("meta_userAgent", sql.NVarChar(400), data.meta?.userAgent || "")
      .input("meta_referer", sql.NVarChar(400), data.meta?.referer || "")
      .input("meta_source", sql.NVarChar(100), data.meta?.source || "start-a-project")
      .query(`
        INSERT INTO enquiries (name, email, company, budget, message, meta_ip, meta_userAgent, meta_referer, meta_source)
        OUTPUT INSERTED._id
        VALUES (@name, @email, @company, @budget, @message, @meta_ip, @meta_userAgent, @meta_referer, @meta_source)
      `);

    return {
      _id: result.recordset[0]._id,
      ...data,
    };
  }

  async findPendingEnquiries(limit = 10) {
    const request = this.pool.request();
    const result = await request
      .input("limit", sql.Int, limit)
      .query(`
        SELECT TOP (@limit) _id, status, mail_nextAttemptAt FROM enquiries
        WHERE status = 'pending' AND (mail_nextAttemptAt IS NULL OR mail_nextAttemptAt <= GETUTCDATE())
        ORDER BY mail_nextAttemptAt ASC
      `);

    return result.recordset.map((row) => ({
      _id: row._id,
      status: row.status,
    }));
  }

  async getEnquiry(id) {
    const request = this.pool.request();
    const result = await request.input("id", sql.UniqueIdentifier, id).query(`
      SELECT * FROM enquiries WHERE _id = @id
    `);

    if (result.recordset.length === 0) return null;

    return this.mapEnquiryRow(result.recordset[0]);
  }

  async updateEnquiryStatus(id, status, mailUpdate = {}) {
    const request = this.pool.request();

    let query = `UPDATE enquiries SET status = @status`;
    request.input("status", sql.NVarChar(20), status);
    request.input("id", sql.UniqueIdentifier, id);

    if (mailUpdate.attempts !== undefined) {
      query += `, mail_attempts = @attempts`;
      request.input("attempts", sql.Int, mailUpdate.attempts);
    }
    if (mailUpdate.lastAttemptAt !== undefined) {
      query += `, mail_lastAttemptAt = @lastAttemptAt`;
      request.input("lastAttemptAt", sql.DateTime2, mailUpdate.lastAttemptAt);
    }
    if (mailUpdate.nextAttemptAt !== undefined) {
      query += `, mail_nextAttemptAt = @nextAttemptAt`;
      request.input("nextAttemptAt", sql.DateTime2, mailUpdate.nextAttemptAt);
    }
    if (mailUpdate.notifiedAt !== undefined) {
      query += `, mail_notifiedAt = @notifiedAt`;
      request.input("notifiedAt", sql.DateTime2, mailUpdate.notifiedAt);
    }
    if (mailUpdate.messageId !== undefined) {
      query += `, mail_messageId = @messageId`;
      request.input("messageId", sql.NVarChar(sql.MAX), mailUpdate.messageId);
    }
    if (mailUpdate.lastError !== undefined) {
      query += `, mail_lastError = @lastError`;
      request.input("lastError", sql.NVarChar(sql.MAX), mailUpdate.lastError);
    }
    if (mailUpdate.autoReplySent !== undefined) {
      query += `, mail_autoReplySent = @autoReplySent`;
      request.input("autoReplySent", sql.Bit, mailUpdate.autoReplySent);
    }

    query += ` WHERE _id = @id`;

    await request.query(query);
  }

  mapEnquiryRow(row) {
    return {
      _id: row._id,
      name: row.name,
      email: row.email,
      company: row.company,
      budget: row.budget,
      message: row.message,
      status: row.status,
      mail: {
        attempts: row.mail_attempts,
        lastAttemptAt: row.mail_lastAttemptAt,
        nextAttemptAt: row.mail_nextAttemptAt,
        notifiedAt: row.mail_notifiedAt,
        messageId: row.mail_messageId,
        lastError: row.mail_lastError,
        autoReplySent: row.mail_autoReplySent,
      },
      meta: {
        ip: row.meta_ip,
        userAgent: row.meta_userAgent,
        referer: row.meta_referer,
        source: row.meta_source,
      },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ref: String(row._id).slice(-6).toUpperCase(),
    };
  }
}

export default AzureSQLAdapter;

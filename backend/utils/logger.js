/**
 * MAQ AUTO EDITOR ULTRA - Structured Logger
 */

const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor(moduleName = 'System', logDir = null) {
    this.moduleName = moduleName;
    this.currentLevel = LOG_LEVELS.INFO;
    this.logDir = logDir || path.join(__dirname, '../../temp/logs');
    this.ensureLogDir();
  }

  ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (e) {
      // Fallback
    }
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${typeof data === 'object' ? JSON.stringify(data) : data}` : '';
    return `[${timestamp}] [${level}] [${this.moduleName}] ${message}${dataStr}`;
  }

  writeLog(formatted) {
    console.log(formatted);
    try {
      const logFile = path.join(this.logDir, `maq_editor_${new Date().toISOString().slice(0, 10)}.log`);
      fs.appendFileSync(logFile, formatted + '\n');
    } catch (e) {
      // Silently proceed
    }
  }

  debug(msg, data) {
    if (this.currentLevel <= LOG_LEVELS.DEBUG) {
      this.writeLog(this.formatMessage('DEBUG', msg, data));
    }
  }

  info(msg, data) {
    if (this.currentLevel <= LOG_LEVELS.INFO) {
      this.writeLog(this.formatMessage('INFO', msg, data));
    }
  }

  warn(msg, data) {
    if (this.currentLevel <= LOG_LEVELS.WARN) {
      this.writeLog(this.formatMessage('WARN', msg, data));
    }
  }

  error(msg, data) {
    if (this.currentLevel <= LOG_LEVELS.ERROR) {
      this.writeLog(this.formatMessage('ERROR', msg, data));
    }
  }
}

module.exports = Logger;

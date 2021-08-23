import winston, {transports} from 'winston';
import Config from './config';

export interface Logger {
    logger: any;
    error(message: string, ...input: any): void;
    warn(message: string, ...input: any): void;
    info(message: string, ...input: any): void;
    verbose(message: string, ...input: any): void;
    debug(message: string, ...input: any): void;
    silly(message: string, ...input: any): void;
}

export class Winston implements Logger {
    private static instance: Winston;
    public logger: winston.Logger;

    error(message: string, ...input: any): void {
        this.logger.log('error', message, input);
    }
    warn(message: string, ...input: any): void {
        this.logger.log('warn', message, input);
    }

    info(message: string, ...input: any): void {
        this.logger.log('info', message, input);
    }

    verbose(message: string, ...input: any): void {
        this.logger.log('verbose', message, input);
    }

    debug(message: string, ...input: any): void {
        this.logger.log('debug', message, input);
    }
    silly(message: string, ...input: any): void {
        this.logger.log('silly', message, input);
    }

    private constructor() {
        this.logger = winston.createLogger({
            level: Config.log_level,
            silent: Config.log_level === 'silent',
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.timestamp(),
                        winston.format.printf(({level, message, label, timestamp}) => {
                            return `${timestamp} ${level}: ${message}`;
                        }),
                    ),
                }),
                new winston.transports.File({
                    filename: 'combined.log',
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.timestamp(),
                        winston.format.printf(({level, message, label, timestamp}) => {
                            return `${timestamp} ${level}: ${message}`;
                        }),
                    ),
                }),
            ],
            exceptionHandlers: [
                new transports.File({filename: 'exceptions.log'}),
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.timestamp(),
                        winston.format.printf(({level, message, label, timestamp}) => {
                            return `${timestamp} ${level}: ${message}`;
                        }),
                    ),
                }),
            ],
        });
    }
    public static Instance(): Logger {
        if (!Winston.instance) {
            Winston.instance = new Winston();
        }

        return Winston.instance;
    }
}

export default Winston.Instance();

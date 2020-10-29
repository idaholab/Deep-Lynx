import nodemailer from "nodemailer"
import Config from "../../config"
import Logger from "../../logger"
import Mail from "nodemailer/lib/mailer";
import Result from "../../result";

export class Emailer {
    private static instance: Emailer
    private _mail: Mail

    public static get Instance(): Emailer {
        if(!Emailer.instance) {
            Emailer.instance = new Emailer();
        }

        return Emailer.instance
    }

    constructor() {
        const auth: {[key:string]: any} = {};

        // authentication could be LOGIN or OAUTH2
        if(Config.smtp_username !== "") auth.user = Config.smtp_username
        if(Config.smtp_password !== "") auth.pass= Config.smtp_password

        // oauth2 auth methods, think gmail, outlook etc.
        if(Config.smtp_client_id !== "") {
            auth.type = "OAuth2"
            auth.clientId = Config.smtp_client_id
        }
        if(Config.smtp_client_secret !== "") auth.clientSecret = Config.smtp_client_secret
        if(Config.smtp_refresh_token !== "") auth.refreshToken = Config.smtp_refresh_token
        if(Config.smtp_access_token !== "") auth.accessToken = Config.smtp_access_token

        this._mail = nodemailer.createTransport({
            pool: true,
            host: Config.smtp_host,
            port: Config.smtp_port,
            secure: Config.smtp_tls,
            tls: {
                rejectUnauthorized: false
            },
            auth
        })

        this._mail.verify((error: any, success) => {
            if(error) {
                Logger.error(`unable to connect to SMTP server ${error}`)
            }
       })
    }

    public send(to: string, subject: string, template: string): Promise<Result<boolean>> {
       if(!Config.email_enabled) {
           Logger.debug(`email not enabled, sending email with subject ${subject} aborted`)
           return new Promise(resolve => resolve(Result.Failure("email not enabled")))
       }

       return new Promise(resolve => {
            this._mail.sendMail({
                from: Config.email_address,
                to,
                subject,
                html: template
            }, (err) => {
                if(err) {
                    Logger.error(`error sending email ${err}`)
                    resolve(Result.Failure(err.message))
                } else {
                    resolve(Result.Success(true))
                }
            })
        })

    }
}

export default Emailer.Instance

import Config from "../../../config"

export function ValidateEmailTemplate(userID: string, emailValidationToken: string): string {
   return `<html>
    <h2>Please validate your email by using the following link</h2>
    <p>${Config.email_validation_url}?id=${userID}&token=${emailValidationToken}</p>
</html>`
}

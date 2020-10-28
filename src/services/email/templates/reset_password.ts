import Config from "../../../config"

export function ResetPasswordEmailTemplate(resetToken: string): string {
   return `<html>
    <h2>Please reset your password by using the following link</h2>
    <p>${Config.reset_password_url}?token=${resetToken}</p>
</html>`
}

import Config from '../../config';

export function ResetPasswordEmailTemplate(email: string, resetToken: string): string {
    return `<html>
    <h2>Please reset your password by using the following link</h2>
    <p>${Config.root_address}/reset-password/?email=${email}&token=${resetToken}&issued=${encodeURIComponent(new Date().toISOString())}</p>
</html>`;
}

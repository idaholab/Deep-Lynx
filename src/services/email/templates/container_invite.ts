import Config from "../../config"

export function ContainerInviteEmailTemplate(token: string, containerName: string): string {
   return `<html>
    <h2>You have been invited to be member of the ${containerName} container on Deep Lynx. Please click the link below to accept the invitation.</h2>
    <p>${Config.container_invite_url}?&token=${token}&containerName=${containerName}</p>
</html>`
}

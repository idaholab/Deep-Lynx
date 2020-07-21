# Get the x509 for SAML 2.0 authentication from the Identity provider

function Get-Cert-From-IdP($Metadata, $Domain) {
    [xml]$IdPMetadata = $Metadata
    $IdPSingleSignOnURL = $IdPMetadata.EntityDescriptor.IDPSSODescriptor.SingleSignOnService |
    ? {$_.Binding -eq "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"} |
    % {$_.Location}
    $IdPSignatureCertificate = $IdPMetadata.EntityDescriptor.IDPSSODescriptor.KeyDescriptor |
    ? {$_.use -eq "signing"} |
    Select-Object -First 1 |
    % {$_.KeyInfo.X509Data.X509Certificate}

    Write-Host $IdPSingleSignOnURL
    $IdPSignatureCertificate | Out-File -Encoding ASCII -FilePath adfs.$Domain.crt
}

# Generates a self-signed certificate through the Windows applet, you must still
# export the private key manually before use.
function Get-Self-Cert-Key($RelyingParty, $PostResponseURL, $Password) {
    $cert = New-SelfSignedCertificate -CertStoreLocation cert:\LocalMachine\My -DnsName $PostResponseURL
    $pw = ConvertTo-SecureString -String $Password -Force -AsPlainText

    $path = 'cert:\localmachine\my\' + $cert.thumbprint
    Export-PfxCertificate -cert $path  -FilePath c:\cert.pfx -Password $pw
    Import-PfxCertificate -FilePath c:\cert.pfx cert:\currentuser\my -Password $pw -Exportable
}
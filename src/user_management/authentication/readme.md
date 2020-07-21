##Authentication Methods and Configuration

### Basic Authentication (`basic`)

It is highly recommended that you only enable Basic Authentication for local development purposes. There is no way to track individual users or to implement access control using this method. All methods and routes will be accessible to anyone possessing the proper username and password. Basic authentication is not considered a secure production method.

1. Set `AUTH_STRATEGY` environment variable to `basic` (either using the `.env` file or the deployment targets own environment)
2. Set `BASIC_USER` and `BASIC_PASSWORD` to desired values

### Token (`token`)
Token authentication relies on the user submitting a JSON Web Token with each request. Said JWT is retrieved by using one of the authentication methods below. Once a user is authenticated and a JWT has been retrieved, subsequent requests against Deep Lynx must be sent with an `Authorization` header with the JWT as a bearer token.

____
## Authentication Methods

#### SAML for Active Directory Federation Services (`saml-adfs`)

In order to enable SAML authentication for active directory federation services, the application will need access to a self signed certificate private key (certificate must be previously registered), and the x509 certificate for SAML authentication located in the ADFS's metadata document. Instructions for acquiring each are below.

1. **Self-signed certificate private key**: There are a few methods by which you can accomplish this. First, you could use [OpenSSL](https://www.openssl.org/) to generate certificate and its private key at the same time - this is probably the easiest way and I've included a bash script (`src/authentication/generate-cert.sh`) which will do this for you on *nix based systems. If you are on Windows, you could also use [OpenSSL](https://www.openssl.org/) or you can use the PowerShell script `CertsDeLynx.ps1`'s `Get-Self-Cert-Key` function. *Note: you must still [export the private key](https://www.mysysadmintips.com/windows/servers/62-export-private-key-and-certificate-from-iis-pfx-file) using Windows certificate management tools yourself.*
2. **x509 Certificate from ADFS Metadata**: In order to verify your identity provider's responses you must have access to their public x509 certificate. Most ADFS services provide a HTTP endpoint serving a `metadata.xml` document which will contain the x509 certificate for SAML 2.0 authentication services. In order to facilitate the retrieval of this key I've included both a bash script (`get-adfs-cert`) and a PowerShell function (`CertDeLynx.ps1`'s `Get-Cert-From-Idp`) to help you retrieve it. The certificate will be saved to a `.crt` file.


Quick example of the PowerShell script
```shell script
$FederationMetatdataUrl = "adfs metadata url"
.\CertsDeLynx.ps1; Get-Cert-From-IdP ((new-object System.Net.WebClient).DownloadString($FederationMetadataUrl))
```

Once you have those two pieces you're ready to configure the application. 


1. Set `AUTH_STRATEGY` environment variable to `saml-adfs` (either using the `.env` file or the deployment targets own environment, applies to all environment variables listed after this step)
2. Set `SAML_ADFS_ISSUER` to the application id assigned when you registered this application with the ADFS service 
3. Set `SAML_ADFS_CALLBACK` to the URL the Identity Provider will send the user to after a successful authentication (this is generally registered with the Identity Provider beforehand)
4. Set `SAML_ADFS_PRIVATE_CERT_PATH` to the absolute path for your self-signed certificate's private key
5. Set `SAML_ADFS_PUBLIC_CERT_PATH` to the downloaded x509 certificate from the ADFS metadata document


*Note: This document assumes that you have configured the Identity Provider service correctly. It is out of scope to provide information on how to do that here. Contact your Active Directory systems administrator if you need help or information*


####Authentication flow

1. The user would be sent to the `/login-saml` route with a query parameter named `redirect` - `localhost:8090/login?redirect={yoururl}`
2. The user is redirected by the Deep Lynx program to Identity Service Provider.
3. The Identity Service Provide redirects the user back to the Deep Lynx application with all relevant authorization information
4. Deep Lynx validates the authentication and then redirects the user to the URL indicated in step one, adding the `token` query parameter to the request. `token` contains the JWT ready for use.
___


#### Username and Password Authentication Flow
This authentication method is very basic. Submit a users' email and password to the service and you'll receive a JWT if the username and password combination matches a known user. If no such combination exists the service will error.
1. The application should POST a form to `/login` with the following fields - `username`, `password`, and `redirect`. If `redirect` is left blank the service will not attempt to redirect the user to a third party program.
2. The user either receives an HTTP response containing the JWT or is redirected to the URL passed in step one with the JWT passed as a query parameter.

#### API Key/Secret Flow
This authentication mode should be used if a user needs to query the Deep Lynx service without using the provided UI. A Key/Secret pair can be generated for the user which they can then use to retrieve a token from the service. This token will be used in all subsequent requests as the Bearer token.
1. User receives a Key/Secret combination either from the application owner or and administrator who generates the key for them.
2. The user submits a GET request to `/login-token` with the following headers: `x-api-key` - the key from the keypair combo and `x-api-secret` - the secret from the keypair combo. The user will recieve the JWT in the response.
3. All subsequent requests are made with the retrieved JWT as a Bearer token authorization method.

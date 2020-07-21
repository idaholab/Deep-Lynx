#!/bin/sh

# Creates a .crt file from the x509 key in the ADFS metadata
if [ "$#" -ne "1" ]; then
  echo "Usage: $0 <adfs server URL>"
  exit 1
fi

URL=$ADFS_SERVER/FederationMetadata/2007-06/FederationMetadata.xml
TEMPFILE=$(mktemp)

wget --no-check-certificate -q -O $TEMPFILE $URL
if [ $? -ne 0 ]; then
  echo "Error requesting $URL"
  exit 1
fi

echo "-----BEGIN CERTIFICATE-----"
(xmllint --shell $TEMPFILE | grep -v '^/ >' | fold -w 64) << EndOfScript
setns a=urn:oasis:names:tc:SAML:2.0:metadata
setns b=http://www.w3.org/2000/09/xmldsig#
cat /a:EntityDescriptor/b:Signature/b:KeyInfo/b:X509Data/b:X509Certificate/text()
EndOfScript
echo "-----END CERTIFICATE-----"

unlink $TEMPFILE
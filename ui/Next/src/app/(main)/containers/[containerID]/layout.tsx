// Providers
import Wireframe from "@/app/_wireframe/wireframe";
import { ReactNode } from "react";

interface Props {
  children?: ReactNode}



export default async function RootLayout({children}: Props) {
    
  return (
    <Wireframe>{children}</Wireframe>
  )
}


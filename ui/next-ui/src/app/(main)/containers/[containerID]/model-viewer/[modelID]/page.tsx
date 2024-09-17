"use client";

// Hooks
import { useEffect, useState } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";

// MUI
import { Button, Container, Grid } from "@mui/material";

// Components
import Panel from "./panel";
import WebGL from "./webgl";

// Store
import { useAppSelector } from "@/lib/store/hooks";

// Types
import { ContainerT, FileT } from "@/lib/types";
type RelatedNodeT = {
  MetatypeName: string;
  OwnerId: string;
  [key: string]: string;
};
export type PayloadT = {
  ConfigType: string;
  FileName: string;
  GraphType: string;
  GraphRootDlId: string;
  AssetMetatypeName: string;
  DefaultInteractions: Array<string>;
  MetatypeMappings: MetatypeMappingsT;
  BaseUrl: string;
  Token: string;
  ContainerId: string;
  FileId: string;
};
type MetatypeMappingsT = Record<string, string> & {
  CADMetadata: string;
};

export default function Home({ params }: { params: { modelID: string } }) {
  // Hooks
  const [render, setRender] = useState<boolean>(false);
  const [payload, setPayload] = useState<PayloadT>({} as PayloadT);
  const [data, setData] = useState<Array<RelatedNodeT> | undefined>(undefined);
  const mappings = useAppSelector((state) => state.modelViewer.mappings);

  // Store
  const container: ContainerT = useContainer();
  const file: FileT = useAppSelector((state) => state.modelViewer.file!);

  const marvelPayload = {
    ConfigType: "Remote",
    FileName: "MRV-1000.glb",
    GraphType: "cad",
    GraphRootDlId: "2",
    AssetMetatypeName: "MeshGameObject",
    DefaultInteractions: ["CadNodeDataToReact", "SelectAndFadeOthers"],
    MetatypeMappings: {
      CADMetadata: "Metadata",
      Quality: "JsonObjectsToReact",
      Requirement: "JsonObjectsToReact",
    },
    BaseUrl: "https://deeplynx.azuredev.inl.gov",
    Token:
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNhbWxfYWRmcyIsImRpc3BsYXlfbmFtZSI6IkphY2sgTS4gQ2F2YWx1enppIiwiZW1haWwiOiJKYWNrLkNhdmFsdXp6aUBpbmwuZ292IiwiYWRtaW4iOmZhbHNlLCJhY3RpdmUiOnRydWUsInJlc2V0X3JlcXVpcmVkIjpmYWxzZSwiZW1haWxfdmFsaWQiOmZhbHNlLCJ0eXBlIjoidXNlciIsInBlcm1pc3Npb25zIjpbXSwicm9sZXMiOltdLCJ1c2VyX2lkIjoiNSIsImtleSI6Ill6VmpObVl5TTJVdE1URmxZUzAwTVdKbUxXSXhaREl0TkRrMk1XVmpaVGd6TW1VdyIsInNlY3JldCI6IiQyYSQxMCRjdW85MGtOMHJPTndldmFwSmM2alYuTVdiSGhYYi9xNWl6ekZYY2lQbzNOdzA0Zmh5TzNLaSIsIm5vdGUiOiJBSEEiLCJpZCI6IjUiLCJpZGVudGl0eV9wcm92aWRlcl9pZCI6IkphY2suQ2F2YWx1enppQGlubC5nb3YiLCJjcmVhdGVkX2F0IjoiMjAyMi0wMy0xNFQwNjowMDowMC4wMDBaIiwibW9kaWZpZWRfYXQiOiIyMDIyLTAzLTE0VDA2OjAwOjAwLjAwMFoiLCJjcmVhdGVkX2J5Ijoic2FtbC1hZGZzIGxvZ2luIiwibW9kaWZpZWRfYnkiOiJzYW1sLWFkZnMgbG9naW4iLCJyZXNldF90b2tlbl9pc3N1ZWQiOm51bGwsImlhdCI6MTcwMTg3OTcwOSwiZXhwIjoxNzcwOTk5NzA5fQ.k98-_uK77bzVL3jp2vzWWbANAqJDPDV7jXDRqlmhY0-rsZPhjBSbFR09robMPIlHuqbfcELtt4cHrLKSitvrymVPrvH78R7Gd3FhJ6lIP_Yqk7N2VNOy7Q42wlbOCR6-nICFS90AdZ7AHRP5AW8mqlmcWgPJvdFXo2Qz6Y1cRvLb0_6Ei6zmRLM1zyKu_ZyPhhBD42aZWkbZDcutKQOIR7K7KfmaTB4eTzKz3JjxAJ3gMXPmZHC3R3KAUMwMggNAgSK7mg6IAPOyE4E158KJr1lOVoBACgoOIbcXdc0sZiFdPvGPjO9FYhZc4XtjPWYmlHLo2NcnT_OXeu4E5Q7_Ag",
    ContainerId: container.id,
    FileId: file.id,
  };

  const domePayload = {
    ConfigType: "Remote",
    FileName: "dome_loading_dock.glb",
    GraphType: "cad",
    GraphRootDlId: "2",
    AssetMetatypeName: "MeshGameObject",
    DefaultInteractions: ["CadNodeDataToReact", "SelectAndFadeOthers"],
    MetatypeMappings: {
      CADMetadata: "Metadata",
      Requirement: "JsonObjectsToReact",
    },
    BaseUrl: "https://deeplynx.azuredev.inl.gov",
    Token:
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNhbWxfYWRmcyIsImRpc3BsYXlfbmFtZSI6IkphY2sgTS4gQ2F2YWx1enppIiwiZW1haWwiOiJKYWNrLkNhdmFsdXp6aUBpbmwuZ292IiwiYWRtaW4iOmZhbHNlLCJhY3RpdmUiOnRydWUsInJlc2V0X3JlcXVpcmVkIjpmYWxzZSwiZW1haWxfdmFsaWQiOmZhbHNlLCJ0eXBlIjoidXNlciIsInBlcm1pc3Npb25zIjpbXSwicm9sZXMiOltdLCJ1c2VyX2lkIjoiNSIsImtleSI6Ill6VmpObVl5TTJVdE1URmxZUzAwTVdKbUxXSXhaREl0TkRrMk1XVmpaVGd6TW1VdyIsInNlY3JldCI6IiQyYSQxMCRjdW85MGtOMHJPTndldmFwSmM2alYuTVdiSGhYYi9xNWl6ekZYY2lQbzNOdzA0Zmh5TzNLaSIsIm5vdGUiOiJBSEEiLCJpZCI6IjUiLCJpZGVudGl0eV9wcm92aWRlcl9pZCI6IkphY2suQ2F2YWx1enppQGlubC5nb3YiLCJjcmVhdGVkX2F0IjoiMjAyMi0wMy0xNFQwNjowMDowMC4wMDBaIiwibW9kaWZpZWRfYXQiOiIyMDIyLTAzLTE0VDA2OjAwOjAwLjAwMFoiLCJjcmVhdGVkX2J5Ijoic2FtbC1hZGZzIGxvZ2luIiwibW9kaWZpZWRfYnkiOiJzYW1sLWFkZnMgbG9naW4iLCJyZXNldF90b2tlbl9pc3N1ZWQiOm51bGwsImlhdCI6MTcwMTg3OTcwOSwiZXhwIjoxNzcwOTk5NzA5fQ.k98-_uK77bzVL3jp2vzWWbANAqJDPDV7jXDRqlmhY0-rsZPhjBSbFR09robMPIlHuqbfcELtt4cHrLKSitvrymVPrvH78R7Gd3FhJ6lIP_Yqk7N2VNOy7Q42wlbOCR6-nICFS90AdZ7AHRP5AW8mqlmcWgPJvdFXo2Qz6Y1cRvLb0_6Ei6zmRLM1zyKu_ZyPhhBD42aZWkbZDcutKQOIR7K7KfmaTB4eTzKz3JjxAJ3gMXPmZHC3R3KAUMwMggNAgSK7mg6IAPOyE4E158KJr1lOVoBACgoOIbcXdc0sZiFdPvGPjO9FYhZc4XtjPWYmlHLo2NcnT_OXeu4E5Q7_Ag",
    ContainerId: container.id,
    FileId: file.id,
  };

  useEffect(() => {
    let MetatypeMappings: MetatypeMappingsT = mappings.reduce(
      (accumulator, mapping) => {
        accumulator[mapping] = "JsonObjectsToReact";
        return accumulator;
      },
      {} as MetatypeMappingsT
    );

    MetatypeMappings["CADMetadata"] = "Metadata";

    setPayload({
      ConfigType: "Remote",
      FileName: file.file_name,
      GraphType: "cad",
      GraphRootDlId: "2", // Must come from Pixyz; now using Pixyz' NodeId instead of DeepLynxID; the root Pixyz' NodeId should always be "2" (at least according to all the CAD models I've tested); however, we can make this more robust, and the best way might be for React to receive info back from Airflow https://github.inl.gov/Digital-Engineering/Pythagoras/issues/17
      AssetMetatypeName: "MeshGameObject",
      DefaultInteractions: ["CadNodeDataToReact", "SelectAndFadeOthers"],
      MetatypeMappings: MetatypeMappings,
      BaseUrl: "https://deeplynx.azuredev.inl.gov",
      Token:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNhbWxfYWRmcyIsImRpc3BsYXlfbmFtZSI6IkphY2sgTS4gQ2F2YWx1enppIiwiZW1haWwiOiJKYWNrLkNhdmFsdXp6aUBpbmwuZ292IiwiYWRtaW4iOmZhbHNlLCJhY3RpdmUiOnRydWUsInJlc2V0X3JlcXVpcmVkIjpmYWxzZSwiZW1haWxfdmFsaWQiOmZhbHNlLCJ0eXBlIjoidXNlciIsInBlcm1pc3Npb25zIjpbXSwicm9sZXMiOltdLCJ1c2VyX2lkIjoiNSIsImtleSI6Ill6VmpObVl5TTJVdE1URmxZUzAwTVdKbUxXSXhaREl0TkRrMk1XVmpaVGd6TW1VdyIsInNlY3JldCI6IiQyYSQxMCRjdW85MGtOMHJPTndldmFwSmM2alYuTVdiSGhYYi9xNWl6ekZYY2lQbzNOdzA0Zmh5TzNLaSIsIm5vdGUiOiJBSEEiLCJpZCI6IjUiLCJpZGVudGl0eV9wcm92aWRlcl9pZCI6IkphY2suQ2F2YWx1enppQGlubC5nb3YiLCJjcmVhdGVkX2F0IjoiMjAyMi0wMy0xNFQwNjowMDowMC4wMDBaIiwibW9kaWZpZWRfYXQiOiIyMDIyLTAzLTE0VDA2OjAwOjAwLjAwMFoiLCJjcmVhdGVkX2J5Ijoic2FtbC1hZGZzIGxvZ2luIiwibW9kaWZpZWRfYnkiOiJzYW1sLWFkZnMgbG9naW4iLCJyZXNldF90b2tlbl9pc3N1ZWQiOm51bGwsImlhdCI6MTcwMTg3OTcwOSwiZXhwIjoxNzcwOTk5NzA5fQ.k98-_uK77bzVL3jp2vzWWbANAqJDPDV7jXDRqlmhY0-rsZPhjBSbFR09robMPIlHuqbfcELtt4cHrLKSitvrymVPrvH78R7Gd3FhJ6lIP_Yqk7N2VNOy7Q42wlbOCR6-nICFS90AdZ7AHRP5AW8mqlmcWgPJvdFXo2Qz6Y1cRvLb0_6Ei6zmRLM1zyKu_ZyPhhBD42aZWkbZDcutKQOIR7K7KfmaTB4eTzKz3JjxAJ3gMXPmZHC3R3KAUMwMggNAgSK7mg6IAPOyE4E158KJr1lOVoBACgoOIbcXdc0sZiFdPvGPjO9FYhZc4XtjPWYmlHLo2NcnT_OXeu4E5Q7_Ag",
      ContainerId: container.id,
      FileId: file.id,
    });
  }, [mappings]);

  const handleRender = () => {
    setRender(true);
  };

  return (
    <>
      <Grid container>
        <Grid item xs={4}>
          <Panel data={data} />
          <br />
          {!render && mappings.length ? (
            <Container>
              <Button onClick={handleRender}>Start Viewer</Button>
            </Container>
          ) : null}
        </Grid>
        <Grid item xs={8}>
          {render ? <WebGL payload={payload} setData={setData} /> : null}
        </Grid>
      </Grid>
    </>
  );
}

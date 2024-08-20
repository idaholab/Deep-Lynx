// Types
import { NextRequest, NextResponse } from "next/server";

import axios from "axios";

const base = process.env.AIRFLOW_URL!;
const token = process.env.TOKEN!;

export const GET = async (req: NextRequest, res: NextResponse) => {
  const { searchParams } = new URL(req.url);

  const containerId = searchParams.get("containerId");
  const dataSourceId = searchParams.get("dataSourceId");
  const dataSourceName = searchParams.get("dataSourceName");
  const nodeId = searchParams.get("nodeId");
  const fileId = searchParams.get("fileId");
  const fileName = searchParams.get("fileName");

  const url = new URL(base);

  url.username = "admin";
  url.password = "admin";

  let response = await axios
    .post(`${url}`, {
      conf: {
        deeplynx_url: "https://deeplynx.azuredev.inl.gov",
        container_id: containerId,
        data_source_id: dataSourceId,
        data_source_name: dataSourceName,
        node_id: nodeId,
        cad_file_id: fileId,
        cad_file_name: fileName,
        api_key: process.env.API_KEY,
        api_secret: process.env.API_SECRET,
        shh_conn_id: "pixyz_ssh",
        create_graph: true,
        metadata_properties: [
          "TYPE",
          "Organization Name",
          "Project Name",
          "UNIQUE_ID",
        ],
      },
    })
    .then((response) => {
      const dag = response.data;
      return { id: dag.dag_id, dag_run_id: dag.dag_run_id, state: dag.state };
    })
    .catch((error) => {
      return error;
    });

  return NextResponse.json(response);
};

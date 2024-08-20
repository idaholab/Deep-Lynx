// Types
import { NextRequest, NextResponse } from "next/server";

import axios from "axios";

const base = process.env.DEEPLYNX_URL!;
const token = process.env.TOKEN!;

export const GET = async (
  req: NextRequest,
  { params }: { params: { containerId: string } }
) => {
  const { searchParams } = new URL(req.url);

  const { containerId } = params;
  const dataSourceId = searchParams.get("dataSourceId");

  const url = new URL(`containers/${containerId}/graphs/nodes`, base);

  let response = await axios
    .get(`${url}`, {
      params: {
        dataSourceID: dataSourceId,
        fileAttached: true,
      },
      headers: {
        Authorization: `bearer ${token}`,
      },
    })
    .then((response) => {
      return response.data.value;
    })
    .catch((error) => {
      return error;
    });

  return NextResponse.json(response);
};

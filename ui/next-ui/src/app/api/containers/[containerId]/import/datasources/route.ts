// Types
import { NextRequest, NextResponse } from "next/server";

import axios from "axios";

const base = process.env.DEEPLYNX_URL!;
const token = process.env.TOKEN!;

export const GET = async (
  req: NextRequest,
  { params }: { params: { containerId: string } }
) => {
  const { containerId } = params;

  const query = req.nextUrl.searchParams;

  const url = new URL(`containers/${containerId}/import/datasources`, base);

  let response = await axios
    .get(`${url}`, {
      params: {
        decrypted: query.get("decrypted"),
        timeseries: query.get("timeseries"),
        count: query.get("count"),
        archived: query.get("archived"),
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

// Types
import { NextRequest, NextResponse } from "next/server";

import axios from "axios";

const base = process.env.DEEPLYNX_URL!;
const token = process.env.NEXT_PUBLIC_TOKEN!;

export const GET = async (
  req: NextRequest,
  { params }: { params: { containerId: string } }
) => {
  const { containerId } = params;
  const url = new URL(`containers/${containerId}/metatypes`, base);

  let response = await axios
    .get(`${url}`, {
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

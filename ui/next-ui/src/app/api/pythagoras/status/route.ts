// Types
import { NextRequest, NextResponse } from "next/server";

import axios from "axios";

const base = process.env.AIRFLOW_URL!;
const token = process.env.TOKEN!;

export const GET = async (req: NextRequest, res: NextResponse) => {
  const { searchParams } = new URL(req.url);

  const url = new URL(base);

  url.username = "admin";
  url.password = "admin";

  let response = await axios
    .get(`${url}`)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return error;
    });

  return NextResponse.json(response);
};

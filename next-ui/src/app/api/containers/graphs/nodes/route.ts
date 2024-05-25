// Types
import { NextRequest, NextResponse } from "next/server";

import axios from "axios";

const base = process.env.DEEPLYNX_URL!;
const token = process.env.TOKEN!;

export const GET = async (req: Request, res: NextResponse) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const url = new URL(`containers/${id}/graphs/nodes`, base);

    let response = await axios
        .get(`${url}`, {
            headers: {
                Authorization: `bearer ${token}`,
            },
        })
        .then((response) => {
            return response.data;
        })
        .catch((error) => {
            return error;
        });

    return NextResponse.json(response);
};

// Types
import { NextResponse } from "next/server";

import axios from "axios";

const base = process.env.DEEPLYNX_URL!;
const token = process.env.TOKEN!;

export const GET = async (req: Request, res: Response) => {
    const { searchParams } = new URL(req.url);
    const containerId = searchParams.get("containerId");
    const nodeId = searchParams.get("nodeId");

    const url = new URL(
        `containers/${containerId}/graphs/nodes/${nodeId}/files`,
        base
    );

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

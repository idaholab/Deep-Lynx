// Types
import { NextRequest, NextResponse } from "next/server";

import axios from "axios";

const base = process.env.DEEPLYNX_URL!;
const token = process.env.TOKEN!;

export const GET = async (
    req: NextRequest,
    { params }: { params: { containerId: string; nodeId: string } }
) => {
    const { containerId, nodeId } = params;

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

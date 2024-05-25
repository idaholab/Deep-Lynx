// Types
import { NextResponse } from "next/server";

import axios from "axios";

const base = process.env.DEEPLYNX_URL!;
const token = process.env.TOKEN!;

export const GET = async (req: Request, res: Response) => {
    const url = new URL("", base);

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

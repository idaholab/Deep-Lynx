'use client';
import { ContainerT } from "@/lib/types/deeplynx";
import { useEffect, useState } from "react";

export default function Containers() {
    const [containers, setContainers] = useState<Array<ContainerT>>([]);

    useEffect(() => {
        async function fetchContainers() {
            let containers = await fetch("/api/containers").then((response) => {
                return response.json();
            });

            setContainers(containers);
        }

        fetchContainers();
    }, []);
}
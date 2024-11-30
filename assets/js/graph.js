import ForceGraph from 'force-graph';

const person_icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="base" viewBox="0 0 24 24" stroke-width="1.5" stroke="white" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>`
const org_icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="base" viewBox="0 0 24 24" stroke-width="1.5" stroke="white" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>`
const file_icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="base" viewBox="0 0 24 24" stroke-width="1.5" stroke="white" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>`
const dir_icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="base" viewBox="0 0 24 24" stroke-width="1.5" stroke="white" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>`

export default {
    mounted() {
        let graph = ForceGraph();
        graph(this.el)
            // the data should be fed entirely from elixir - any work that needs to happen to transform
            // or make it play nicely, should happen in elixir
            .graphData({ nodes: JSON.parse(this.el.dataset.items), links: JSON.parse(this.el.dataset.links) })
            .width(this.el.offsetWidth)
            .height(this.el.offsetHeight * 0.75)
            .nodeLabel("label")
            .nodeCanvasObject(({ path, type, x, y }, ctx) => {
                const size = 12;

                ctx.fillText(path, x - size / 2, y - size / 2)
                if (type == "additional") {
                    ctx.fillStyle = "base";
                    ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI, false); ctx.fill();
                    return
                }

                var img = new Image();

                switch (type) {
                    case "directory": img.src = `data:image/svg+xml,${dir_icon}`; break;
                    case "root_directory": img.src = `data:image/svg+xml,${dir_icon}`; break;
                    case "file": img.src = `data:image/svg+xml,${file_icon}`; break;
                    case "person": img.src = `data:image/svg+xml,${person_icon}`; break;
                    case "organization": img.src = `data:image/svg+xml,${org_icon}`; break;
                }

                ctx.font = `${4}px Sans-Serif`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
            })
            .cooldownTicks(100)
            .linkColor(["white"])
            .onNodeClick((node, event) => {
                if (node.type == "additional") {
                    const { nodes, links } = graph.graphData();
                    graph.graphData({
                        nodes: nodes.filter((n) => n.id !== node.id),
                        links: links.filter(l => l.source !== node && l.target !== node)
                    })

                    this.pushEvent("additional_clicked", { id: node.original_id, origin_id: node.origin_id })
                }
            })
            .linkDirectionalArrowLength(2)
            .linkCanvasObjectMode(() => 'after')
            .linkCanvasObject((link, ctx) => {
                const MAX_FONT_SIZE = 2;
                const LABEL_NODE_MARGIN = graph.nodeRelSize() * 1.5;

                const start = link.source;
                const end = link.target;

                // ignore unbound links
                if (typeof start !== 'object' || typeof end !== 'object') return;

                // calculate label positioning
                const textPos = Object.assign(...['x', 'y'].map(c => ({
                    [c]: start[c] + (end[c] - start[c]) / 2 // calc middle point
                })));

                const relLink = { x: end.x - start.x, y: end.y - start.y };

                const maxTextLength = Math.sqrt(Math.pow(relLink.x, 2) + Math.pow(relLink.y, 2)) - LABEL_NODE_MARGIN * 2;

                let textAngle = Math.atan2(relLink.y, relLink.x);
                // maintain label vertical orientation for legibility
                if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
                if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

                const label = `${link.label}`;

                // estimate fontSize to fit in link length
                ctx.font = '1px Sans-Serif';
                const fontSize = Math.min(MAX_FONT_SIZE, maxTextLength / ctx.measureText(label).width);
                ctx.font = `${fontSize}px Sans-Serif`;
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

                // draw text label (with background rect)
                ctx.save();
                ctx.translate(textPos.x + 3, textPos.y + 3);
                ctx.rotate(textAngle);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'base';
                ctx.fillText(label, 0, 0);
                ctx.restore();
            });

        // center the graph after it's rendered
        graph.d3Force('center', null)
        graph.onEngineStop(() => graph.zoomToFit(400, 50));

        this.handleEvent("additional_data", (payload) => {
            const { nodes, links } = graph.graphData();
            graph.graphData({
                nodes: [...nodes, ...payload.nodes],
                links: [...links, ...payload.links]
            })

            // center the graph after it's rendered
            graph.d3Force('center', null)
            graph.onEngineStop(() => graph.zoomToFit(400, 50));
        })
    }
}



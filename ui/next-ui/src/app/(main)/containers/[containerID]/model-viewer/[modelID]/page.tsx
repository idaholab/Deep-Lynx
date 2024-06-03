export default function Home({params}: {params: {modelID: string}}) {
    return (
        <div>
            <h1>Model Viewer for Model ID: {params.modelID}</h1>
        </div>
    );
}

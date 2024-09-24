export default function Home({params}: {params: {importID: string}}) {
    return (
        <div>
            <h1>Import ID: {params.importID}</h1>
        </div>
    );
}

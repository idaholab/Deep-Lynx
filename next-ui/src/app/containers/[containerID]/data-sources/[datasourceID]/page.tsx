export default function Home({params}: {params: {datasourceID: string}}) {
    return (
        <div>
            <h1>Specific Data Source: {params.datasourceID}</h1>
        </div>
    );
}

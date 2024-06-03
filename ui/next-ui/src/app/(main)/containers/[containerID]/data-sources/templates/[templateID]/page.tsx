export default function Home({params}: {params: {templateID: string}}) {
    return (
        <div>
            <h1>Specific Data Source Template: {params.templateID}</h1>
        </div>
    );
}

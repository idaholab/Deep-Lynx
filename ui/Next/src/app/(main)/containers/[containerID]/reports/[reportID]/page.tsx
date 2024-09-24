export default function Home({params}: {params: {reportID: string}}) {
    return (
        <div>
            <h1>Report ID: {params.reportID}</h1>
        </div>
    );
}

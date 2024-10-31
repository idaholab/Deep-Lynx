export default async function Home(props: {params: Promise<{reportID: string}>}) {
    const params = await props.params;
    return (
        <div>
            <h1>Report ID: {params.reportID}</h1>
        </div>
    );
}

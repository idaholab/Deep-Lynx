export default async function Home(props: {params: Promise<{actionID: string}>}) {
    const params = await props.params;
    return (
        <div>
            <h1>Event Action ID: {params.actionID}</h1>
        </div>
    );
}

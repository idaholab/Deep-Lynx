export default function Home({params}: {params: {actionID: string}}) {
    return (
        <div>
            <h1>Event Action ID: {params.actionID}</h1>
        </div>
    );
}

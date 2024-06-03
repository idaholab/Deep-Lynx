export default function Home({params}: {params: {fileID: string}}) {
    return (
        <div>
            <h1>Specific File ID: {params.fileID}</h1>
        </div>
    );
}

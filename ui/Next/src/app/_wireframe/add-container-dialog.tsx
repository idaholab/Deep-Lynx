'use client';
import * as React from 'react';
import MultiSelect from './multi-select';
import { ContainerT } from '@/lib/types/deeplynx';
import { useState } from 'react';
import Error from './error';

const dataSources = ["standard", "http", "aveva", "p6", "timeseries", "custom"];
const token = process.env.DEEPLYNX_TOKEN;

export default function FormDialog() {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState('');
    const [url, setURL] = useState('');
    const [versioning, setVersioning] = useState('');
    const [dataSourceArray, setDataSources] = useState([''])
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');


    const handleSubmit = async (e: any) => {
        e.preventDefault();
        try {
            const data = { name, description, config: { versioning, enabled_data_sources: dataSources } };

            const response = await fetch('http://localhost:8090/containers', {
                method: 'POST',
                headers: {
                    "Authorization": `bearer ${process.env.NEXT_PUBLIC_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                const data = await response.json();
                window.location.href = `http://localhost:3000/containers/${data.value[0].id}`;
            } else {
                const errorData = await response.json();
                const detailedError = JSON.parse(errorData.error);
                setError(true);
                console.log(JSON.stringify(detailedError.error.detail), 'Key (name, created_by)=(maybe, 1) already exists.')
                if (detailedError.error.detail == "Key (name, created_by)=(maybe, 1) already exists.") {

                    setErrorMessage('Container name already exists');
                } else {
                    setErrorMessage(detailedError.error.detail);
                }

            }

        } catch (err) {
            setError(true);
            setErrorMessage('An unexpected error occurred.');
        }
    };

    return (
        <div className="modal" id="my-dialog">
            <div className="modal-box p-9">
                {error && (
                    <div className="alert alert-error p-1">
                        <label className='pl-20'>
                            Error: {errorMessage}
                        </label>
                    </div>
                )}
                <h3 className="font-bold text-lg text-center">Create New Container</h3>
                <form onSubmit={handleSubmit}>
                    <div className='pb-4'>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Name</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input input-bordered input-sm"
                                required
                                maxLength={255}
                            />
                        </div>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Description</span>
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="input input-bordered input-lg"
                                required
                                maxLength={255}
                            />
                        </div>
                    </div>
                    <div className="rounded-lg bg-dialogGray p-8 text-black">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Upload .owl file (optional)
                                    <div className='tooltip' data-tip="File">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 ml-2">
                                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </span>

                            </label>
                            <input
                                type="file"
                                value={file}
                                onChange={(e) => setFile(e.target.value)}
                                className="file-input input-bordered file-input-accent bg-white file:text-white"
                            />
                        </div>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">URL to .owl File
                                    <div className='tooltip' data-tip="URL">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 ml-2">
                                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </span>

                            </label>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setURL(e.target.value)}
                                className="input rounded-lg bg-white input-bordered w-11/12 caret-black"
                                placeholder="https://example.com"
                            />
                        </div>
                        <div className="form-control pt-2">
                            <label className="label cursor-pointer flex justify-start justify-items-start">
                                <input value={versioning} onChange={(e) => setVersioning(e.target.value)} type="checkbox" name="ontology_versioning_enabled" className="checkbox [--chkbg:theme(colors.cherenkov)]" />
                                <div className="text-black ml-2">Ontology Versioning Enabled <span className="align-super text-xs">BETA</span></div>
                                <div className='tooltip' data-tip="Ontology Versioning Blurb">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 ml-2">
                                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </label>
                        </div>
                    </div>
                    <div className='p-4 flex items-center'>
                        <MultiSelect options={dataSources} />
                        <span className=''>Select Enabled Data Source Types</span>
                    </div>
                    <div className='text-sm p-4 pb-1 font-normal'>Need Help? Details on creating or updating a container via an ontology file can be found on our <a href='https://github.com/idaholab/Deep-Lynx/wiki/'>Wiki</a></div>

                    <div className="modal-action justify-between">
                        <a href="#" className="btn btn-neutral text-accent border-solid border-accent">Cancel</a>
                        <button type="submit" className="btn btn-accent text-white">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
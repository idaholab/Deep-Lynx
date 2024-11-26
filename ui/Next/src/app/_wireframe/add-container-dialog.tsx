'use client';
import * as React from 'react';
import MultiSelect from './multi-select';

const dataSources = ["standard", "http", "aveva", "p6", "timeseries", "custom"];

interface NewContainer {
    name: string,
    description: string, 
    config: {
      data_versioning_enabled: boolean,
      ontology_versioning_enabled: boolean,
      enabled_data_sources: string[]
  }}

export default function FormDialog() {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div>
            <button className="btn btn-ghost btn-lg btn-circle" onClick={() => setIsOpen(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 30" fill="#07519E" className="size-20">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" clipRule="evenodd" />
                </svg>
            </button>

            {isOpen && (
                <div id="newContainerModal" className="modal modal-open text-black bg-white">
                    <div className="modal-box bg-white p-12 pt-3 pb-3 font-normal caret-black">
                        <h3 className="text-center font-normal">Create New Container</h3>
                        <div className='ml-4'>
                            <div>Name</div>
                            <input type="text" className="rounded-lg border-solid border-strokeGray w-11/12" />
                            <div className='pt-2'>Description</div>
                            <input type="text" className="rounded-lg border-solid border-strokeGray w-11/12 pb-12" />
                        </div>
                        <div className="ml-4 mt-4">
                            <div className="rounded-lg bg-dialogGray p-8 text-black mr-4">
                                <div className='flex items-center mt-4'>
                                    <div className='ml-4'>Upload .owl file (optional)</div>
                                    <div className='tooltip' data-tip="FILE">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 ml-2">
                                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                                <input type="file" className="file-input file-input-accent bg-white file:text-white"/>
                                <div className='flex items-center mt-4'>
                                    <div className='ml-4'>URL to .owl File</div>
                                    <div className='tooltip' data-tip="URL">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 ml-2">
                                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                                <input type="url" placeholder="https://example.com" className="input rounded-lg bg-white input-bordered w-11/12 caret-black	" />
                                <div className="form-control pt-2">
                                    <label className="label cursor-pointer flex justify-start justify-items-start">
                                        <input type="checkbox" defaultChecked className="checkbox [--chkbg:theme(colors.cherenkov)]" />
                                        <div className="text-black ml-2">Ontology Versioning Enabled <span className="align-super text-xs">BETA</span></div>
                                        <div className='tooltip' data-tip="Ontology Versioning Blurb">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 ml-2">
                                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className='p-4 flex items-center'>
                           <MultiSelect options={dataSources}/>
                            <span className=''>Select Enabled Data Source Types</span>
                        </div>
                        <div className='text-sm p-4 pb-1'>Need Help? Details on creating or updating a container via an ontology file can be found on our <a href='https://github.com/idaholab/Deep-Lynx/wiki/'>Wiki</a></div>
                        <div className='flex justify-between pb-2 pl-3 pr-3'>
                        <div className="modal-action">
                            <button className="btn btn-accent text-white" onClick={() => setIsOpen(false)}>Save</button>
                        </div>
                        <div className="modal-action justify-left">
                            <button className="btn btn-accent text-white" onClick={() => setIsOpen(false)}>Close</button>
                        </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
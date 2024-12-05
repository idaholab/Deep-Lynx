"use client";


const ContainerDashboard = () => {
  // This hook initiates API calls that bring in container data from DeepLynx


  return (
    <>
        <div className="relative">
          <div className="text-2xl pb-8 pl-2">
            Container Dashboard
          </div>
          <div className="flex justify-between items-center">
            <div></div>
            <div className="btn border-solid border-accent bg-white text-accent">
              Manage Dashboard</div>
          </div>
          <hr />
          <div className="rounded-lg border-solid border-strokeGray border-2 min-h-64 text-black">
            <div className="p-2 pt-3">Deeplynx Container Overview</div>
          </div>
          <div className="p-1 pt-4"> Your Data</div>
          <hr></hr>
          <div className="grid grid-cols-3 gap-4 ">
            <div className="border-solid border-2 border-strokeGray rounded-lg min-h-40 flex flex-col p-4">
              <div className="p-2">
                File Viewer
              </div>
              <div className="btn btn-accent mt-auto">
                <a className="link no-underline link-neutral flex items-center" href="/files">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 mr-2">
                    <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
                    <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
                  </svg>
                  <div>File Viewer</div>
                </a>
              </div>
            </div>
            <div className="border-solid border-2 border-strokeGray rounded-lg min-h-40 flex flex-col p-4">
              <div className="p-2">
                2D/3D Model
              </div>
              <div className="btn btn-accent mt-auto">
                <a className="link no-underline link-neutral flex items-center" href="/containers">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 mr-2">
                    <path d="M6 3a3 3 0 0 0-3 3v1.5a.75.75 0 0 0 1.5 0V6A1.5 1.5 0 0 1 6 4.5h1.5a.75.75 0 0 0 0-1.5H6ZM16.5 3a.75.75 0 0 0 0 1.5H18A1.5 1.5 0 0 1 19.5 6v1.5a.75.75 0 0 0 1.5 0V6a3 3 0 0 0-3-3h-1.5ZM12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5ZM4.5 16.5a.75.75 0 0 0-1.5 0V18a3 3 0 0 0 3 3h1.5a.75.75 0 0 0 0-1.5H6A1.5 1.5 0 0 1 4.5 18v-1.5ZM21 16.5a.75.75 0 0 0-1.5 0V18a1.5 1.5 0 0 1-1.5 1.5h-1.5a.75.75 0 0 0 0 1.5H18a3 3 0 0 0 3-3v-1.5Z" />
                  </svg>
                  <div>Model Viewer</div>
                </a>
              </div>
            </div>
            <div className="border-solid border-2 border-strokeGray rounded-lg min-h-40 flex flex-col p-4">
              <div className="p-2">
                Data Viewer
              </div>
              <div className="btn btn-accent mt-auto">
                <a className="link no-underline link-neutral flex items-center" href="/containers">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 mr-2">
                    <path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875Z" />
                    <path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 0 0 1.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 0 0 1.897 1.384C6.809 12.164 9.315 12.75 12 12.75Z" />
                    <path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 15.914 9.315 16.5 12 16.5Z" />
                    <path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 19.664 9.315 20.25 12 20.25Z" />
                  </svg>
                  <div>Data Viewer</div>
                </a>
              </div>
            </div>
            <div className="border-solid border-2 border-strokeGray rounded-lg min-h-40 col-span-2 flex flex-col p-4"> <div className="p-2">
              Data Viewer Wide
            </div>
              <div className="btn btn-accent mt-auto">
                <a className="link no-underline link-neutral flex items-center" href="/containers">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 mr-2">
                    <path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875Z" />
                    <path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 0 0 1.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 0 0 1.897 1.384C6.809 12.164 9.315 12.75 12 12.75Z" />
                    <path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 15.914 9.315 16.5 12 16.5Z" />
                    <path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 19.664 9.315 20.25 12 20.25Z" />
                  </svg>
                  <div>Data Viewer</div>
                </a>
              </div></div>
            <div className="border-solid border-2 border-strokeGray rounded-lg min-h-40">Possible additional widget</div>
            <div className="border-solid border-2 border-strokeGray rounded-lg min-h-40">Possible additional widget</div>
            <div className="border-solid border-2 border-strokeGray rounded-lg min-h-40 col-span-2 ...">Possible additional widget</div>
          </div>
        </div>
    </>
  );
};

export default ContainerDashboard;

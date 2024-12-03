// Hooks
import { classes } from "../../styles";

// Types
import { ContainerT } from "@/lib/types/deeplynx";

import Navbar2 from "@/app/_wireframe/navbar2";
import BasicSidebar2 from "@/app/_wireframe/basic-sidenav2";
import AddContainerDialog from "@/app/_wireframe/add-container-dialog";


export default async function ContainerSelect() {

  let headers = {
    Authorization: `bearer ${process.env.NEXT_PUBLIC_TOKEN}`,
  }
  const reponse = await fetch("http://localhost:8090/containers", { headers: headers });
  const test = await reponse.json();
  const containers: ContainerT[] = test.value;

  return (
    <>
      <div>
        <div>
          <Navbar2 />
          <BasicSidebar2>

            {/* Top */}
            <div className="flex flex-row justify-between pl-9 pr-9">
              <div className="text-2xl p-5 text-black">Your Containers</div>
              <input type="text" placeholder="Search..." className="input input-bordered  max-w-xs bg-white mb-3 border-black caret-black" />
            </div>
            <hr className="mt-0.5 mb-5" />

            {/* Grid */}
            <div className="flex-grow">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-9">
                {containers.map((item: any, index: number) => (
                  index === 0 ? (
                    <div key={index} className="p-4 rounded-lg flex flex-col items-center border-[#D2CDCD] border-solid bg-white justify-center">
                      <div className="text-lg font-semibold mb-2">
                        <div className="container mx-auto">

                          <button className="btn btn-ghost btn-lg btn-circle">
                            <a href="#my-dialog">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 30" fill="#07519E" className="size-20">
                                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" clipRule="evenodd" />
                              </svg>
                            </a>
                          </button>
                          <AddContainerDialog />
                        </div>
                      </div>
                      <div className="text-lg text-black">Create New Container</div>
                    </div>
                  ) : (
                    <div key={index} className="flex flex-col justify-between text-center p-4 rounded-lg border-[#D2CDCD] border-solid bg-[#E9EDF0]">
                      <div className="align-middle">
                        <div className="text-lg text-black font-semibold p-1">{item.name}</div>
                        <div className="text-sm text-black p-2 text-pretty">{item.description}</div>
                        <div className="flex flex-wrap justify-center mt-4">
                          <button className="btn btn-outline bg-white border-cherenkov text-cherenkov lowercase m-2 w-full md:w-auto">More Info</button>
                          <button className="btn btn-primary bg-cherenkov text-white lowercase m-2 w-full md:w-auto">Enter Container</button>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </BasicSidebar2>
        </div>
      </div>

    </>
  );
};

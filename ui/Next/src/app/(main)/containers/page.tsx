
'use client';
// Hooks
import { classes } from "../../styles";

// Types
import { ContainerT } from "@/lib/types/deeplynx";

// MUI

// Store
import { useAppSelector } from "@/lib/store/hooks";
import AddContainerDialog from "@/app/_wireframe/add-container-dialog";

import Containers from './containers'
import { useState } from "react";
import Navbar2 from "@/app/_wireframe/navbar2";
import BasicSidebar2 from "@/app/_wireframe/basic-sidenav2";


let list = [
  { name: 'QuantumBox', description: 'Advanced quantum computing device designed for high-efficiency quantum calculations, offering unprecedented processing power and speed.' },
  { name: 'NanoChamber', description: 'Microscopic containment for nanomaterials, ensuring stable and secure storage for delicate nanostructures used in cutting-edge research.' },
  { name: 'BioReactor', description: 'System for growing microbial cultures, optimized for maintaining ideal conditions to cultivate and study various microorganisms and bioengineered cells.' },
  { name: 'PhotonContainer', description: 'Light-based data storage unit that leverages photonic technology to store massive amounts of data with high speed and minimal energy consumption.' },
  { name: 'GeoVault', description: 'Geological sample preservation unit designed to maintain and protect valuable geological specimens, ensuring their integrity for scientific analysis.' },
  { name: 'CryoBox', description: 'Cryogenic sample storage container engineered to preserve biological and chemical samples at ultra-low temperatures, ensuring long-term viability.' },
  { name: 'QuantumBox', description: 'Advanced quantum computing device designed for high-efficiency quantum calculations, offering unprecedented processing power and speed.' },
  { name: 'NanoChamber', description: 'Microscopic containment for nanomaterials, ensuring stable and secure storage for delicate nanostructures used in cutting-edge research.' },
  { name: 'BioReactor', description: 'System for growing microbial cultures, optimized for maintaining ideal conditions to cultivate and study various microorganisms and bioengineered cells.' },
  { name: 'PhotonContainer', description: 'Light-based data storage unit that leverages photonic technology to store massive amounts of data with high speed and minimal energy consumption.' },
  { name: 'GeoVault', description: 'Geological sample preservation unit designed to maintain and protect valuable geological specimens, ensuring their integrity for scientific analysis.' },
  { name: 'CryoBox', description: 'Cryogenic sample storage container engineered to preserve biological and chemical samples at ultra-low temperatures, ensuring long-term viability.' }
];




const ContainerSelect = () => {

  // useEffect(() => {
  //   // When the user selects a container, dispatch that container's metadata to the Redux store, and navigate to the dashboard
  //   if (selectedContainer) {
  //     const selection: ContainerT = containers.find(
  //       (container: ContainerT) => container!.id === selectedContainer
  //     )!;

  //     storeDispatch(containerActions.setContainer(selection));
  //     router.push(`/containers/${selection.id}`);
  //   }
  // }, [containers, selectedContainer, router, storeDispatch]);

  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };


  return (
    <>
      <div>
        <div>
          <Navbar2 />
          <BasicSidebar2>

            {/* Top */}
            <div className="flex flex-row justify-between pl-9 pr-9">
              <div className="text-2xl p-5 text-black">Your Containers</div>
              <input type="text" placeholder="Search..." className="input input-bordered  max-w-xs bg-white mb-3 border-black" />
            </div>
            <hr className="mt-0.5 mb-5" />

            {/* Grid */}
            <div className="flex-grow">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-9">
                {list.map((item, index) => (
                  index === 0 ? (
                    <div key={index} className="p-4 rounded-lg flex flex-col items-center border-[#D2CDCD] border-solid bg-white justify-center">
                      <div className="text-lg font-semibold mb-2">
                        <div>
                          <button onClick={handleClickOpen} className="btn btn-ghost">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#07519E" className="size-20">
                              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <AddContainerDialog open={open} onClose={handleClose} />
                        </div>
                      </div>
                      <div className="text-lg text-black">Create New Container</div>
                    </div>
                  ) : (
                    <div key={index} className="flex flex-col justify-between text-center p-4 rounded-lg border-[#D2CDCD] border-solid bg-[#E9EDF0]">
                      <div className="align-middle">
                        <div className="text-lg text-black font-semibold p-1">{item.name}</div>
                        <div className="text-sm text-black p-2">{item.description}</div>
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

export default ContainerSelect;

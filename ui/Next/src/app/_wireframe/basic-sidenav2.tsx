'use client'; 
// // Hooks
import * as React from 'react';

import { translations } from '@/lib/translations';
import { classes } from "../styles";
import { ReactNode, useState } from 'react';

import './basic-sidenav2'


const faq = [
    {
        "question": "How does DeepLynx integrate with other systems?",
        "answer": "DeepLynx integrates with other systems through APIs, data connectors, and custom integration scripts, enabling seamless data flow between different platforms and databases."
    },
    {
        "question": "What types of data can DeepLynx handle?",
        "answer": "DeepLynx can handle structured, semi-structured, and unstructured data from multiple sources, including databases, IoT devices, spreadsheets, and cloud services."
    },
    {
        "question": "Can DeepLynx visualize data?",
        "answer": "Yes, DeepLynx offers powerful data visualization tools that allow users to create graphs to better understand and analyze their data."
    },
    {
        "question": "Is DeepLynx scalable?",
        "answer": "Yes, DeepLynx is designed to be scalable, accommodating growing data volumes and increasing user demands without compromising performance."
    },
    {
        "question": "What are the main benefits of using DeepLynx?",
        "answer": "The main benefits include improved data integration, enhanced data visualization, increased operational efficiency, better decision-making, and robust data security."
    },
    {
        "question": "Do I need technical expertise to use DeepLynx?",
        "answer": "While some technical knowledge can be helpful, DeepLynx is designed with user-friendly interfaces and comprehensive support resources to assist users with varying levels of technical expertise."
    }
]

interface Props {
    children: ReactNode;
}

export default function BasicSidebar2({ children }: Props) {
    // Hooks
    const [openIndex, setOpenIndex] = useState(null);
    const [open, setOpen] = useState(true);


    const handleCollapse = (index: any) => {
        setOpenIndex((prevIndex) => (prevIndex === index ? null : index));
    }

    const handleDrawerMovement = () => {
        let result = !open
        setOpen(result)
    }

    return (
        <>
            <div className="drawer drawer-open">
                <input id="my-drawer" type="checkbox" className="drawer-toggle" />
                <div className="drawer-content mt-16 z-10 relative">
                    {children}
                </div>
                <div className="flex justify-end z-20 relative">
                            <button className={`btn btn-primary btn-sm drawer-button bg-darkBlue hover:bg-darkBlue fixed top-20 w-6 h-12 bg-[#083769] rounded-r-lg flex justify-center items-center cursor-pointer text-white ${open ? 'left-[390px]' : 'left-0'}`} onClick={handleDrawerMovement} >
                                {open ? '<' : '>'}
                            </button>
                        </div>
                <div className="drawer-side mt-14">
                    <label htmlFor="my-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
                    <aside className={`left-0 menu min-h-full bg-basicSideNav text-base-content p-0 ${open ? 'w-96' : 'w-0'}`}>
                        
                        <ul className='p-9'>
                            <div className='text-black text-2xl mt-0'>{translations.en.containers.welcome}</div>
                            <div className='text-black text-sm mt-0 pt-4'>
                                DeepLynx is a unique data warehouse designed to provide easy collaboration on large projects. DeepLynx allows users to define an ontology and then store data under it. Find more information on our wiki by clicking <a href="https://github.com/idaholab/Deep-Lynx/wiki" className="text-blue-500 underline">here</a>.
                            </div>
                            <div className="flex flex-col pt-4">
                                <div className='pb-0 text-lg text-black'>FAQ's</div>
                                <div className="divider divider-default p-0 m-0"></div>
                            </div>
                            {faq.map((bullets, index) => (
                                <div key={index}>
                                    <li className="mb-2 pl-0">
                                        <button className="btn-ghost w-fit bg-basicSideNav p-0 m-0" onClick={() => handleCollapse(index)}>
                                            <span className="text-black">{bullets.question}</span>
                                        </button>
                                        {openIndex === index && (
                                            <div className="pl-2 mt-2 text-black">
                                                {bullets.answer}
                                            </div>
                                        )}
                                    </li>
                                    <div className="divider divider-default m-0"></div>
                                </div>
                            ))}
                            <div className="text-sm">Have more questions? Get in touch at <a href="mailto: deeplynx@admin.com" >deeplynx@admin.com</a></div>
                        </ul>
                    </aside>
                </div>
            </div>
        </>
    );
}

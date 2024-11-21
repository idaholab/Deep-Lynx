
// // Hooks
import * as React from 'react';

import { translations } from '@/lib/translations';
import { classes } from "../styles";
import { ReactNode } from 'react';

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
    const [open, setOpen] = React.useState(true);
    const [openIndex, setOpenIndex] = React.useState(null);

    const handleCollapse = (index: any) => {
        setOpenIndex((prevIndex) => (prevIndex === index ? null : index));
    }

    return (
        <>
            <div className="flex">
                <div className="drawer mt-20 ml-0">
                    <input id="my-drawer" type="checkbox" className="drawer-toggle" />
                    <div className="drawer-content">
                        <label htmlFor="my-drawer" className="btn btn-primary btn-sm drawer-button bg-darkBlue hover:bg-darkBlue">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="size-6">
                                <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z" clipRule="evenodd" />
                            </svg>
                        </label>
                        <div className='text-center'>
                            <p>
                                {children}
                            </p>
                        </div>
                    </div>
                    <div className="drawer-side mt-16 scroll-mx-0">
                        <label htmlFor="my-drawer" aria-label="close sidebar" className="drawer-overlay justify-center">
                        </label>
                        <ul className="menu bg-basicSideNav text-black p-9 min-h-full w-80 mt-0">
                            <p className='text-2xl mt-0'>{translations.en.containers.welcome}</p>
                            <p className='text-sm mt-0'>
                                DeepLynx is a unique data warehouse designed to provide easy collaboration on large projects. DeepLynx allows users to define an ontology and then store data under it. Find more information on our wiki by clicking <a href="https://github.com/idaholab/Deep-Lynx/wiki" className="text-blue-500 underline">here</a>.
                            </p>
                            <div className="flex w-full flex-col">
                                <div className='pb-0 text-lg'>FAQ's</div>
                                <div className="divider divider-default p-0 m-0"></div>
                            </div>
                            {faq.map((bullets, index) => (
                                 <div>
                                <li key={index} className="mb-2 pl-0">
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
                            <p className="text-sm">Have more questions? Get in touch at <a href="mailto: deeplynx@admin.com" >deeplynx@admin.com</a></p>
                        </ul>
                    </div>
                </div>
            </div>

        </>
    );
}

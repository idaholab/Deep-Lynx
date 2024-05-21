"use client";
/*
  This example requires some changes to your config:

  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
    ],
  }
  ```
*/
import { Fragment, useEffect, useState } from "react";
import { Dialog, Menu, Transition } from "@headlessui/react";
import {
    Bars3Icon,
    BellIcon,
    CalendarIcon,
    ChartBarSquareIcon,
    ChartPieIcon,
    Cog6ToothIcon,
    CubeTransparentIcon,
    DocumentDuplicateIcon,
    DocumentIcon,
    FolderIcon,
    HomeIcon,
    InboxArrowDownIcon,
    MagnifyingGlassCircleIcon,
    PaperAirplaneIcon,
    RectangleStackIcon,
    RocketLaunchIcon,
    ShareIcon,
    TagIcon,
    UsersIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import {
    ChevronDownIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/20/solid";
import Image from "next/image";
import DarkModeToggle from "./dark-mode-toggle";

const dashboard = {
    name: "Dashboard",
    href: "#",
    icon: HomeIcon,
    current: true,
};
const data = [
    {
        name: "View",
        href: "#",
        icon: MagnifyingGlassCircleIcon,
        current: false,
    },
    {
        name: "Model Viewer",
        href: "model-viewer",
        icon: CubeTransparentIcon,
        current: false,
    },
    { name: "Files", href: "#", icon: DocumentIcon, current: false },
    { name: "Reports", href: "#", icon: ChartBarSquareIcon, current: false },
];
const dataManagement = [
    { name: "Ontology", href: "#", icon: ShareIcon, current: false },
    {
        name: "Data Sources",
        href: "#",
        icon: InboxArrowDownIcon,
        current: false,
    },
    { name: "Tags", href: "#", icon: TagIcon, current: false },
    { name: "Events", href: "#", icon: PaperAirplaneIcon, current: false },
];
const userNavigation = [
    { name: "Your profile", href: "#" },
    { name: "Sign out", href: "#" },
];

function classNames(...classes: any[]) {
    return classes.filter(Boolean).join(" ");
}

export default function Sidebar(props: any) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <>
            <div>
                <Transition.Root show={sidebarOpen} as={Fragment}>
                    <Dialog
                        as="div"
                        className="relative z-50"
                        onClose={() => setSidebarOpen(false)}
                    >
                        <Transition.Child
                            as={Fragment}
                            enter="transition-opacity ease-linear duration-300"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="transition-opacity ease-linear duration-300"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <div className="fixed inset-0 bg-gray-900/80" />
                        </Transition.Child>

                        <div className="fixed inset-0 flex">
                            <Transition.Child
                                as={Fragment}
                                enter="transition ease-in-out duration-300 transform"
                                enterFrom="-translate-x-full"
                                enterTo="translate-x-0"
                                leave="transition ease-in-out duration-300 transform"
                                leaveFrom="translate-x-0"
                                leaveTo="-translate-x-full"
                            >
                                <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                                    {/* Sidebar component, swap this element with another sidebar if you like */}
                                    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-600 dark:bg-gray-900 pb-4 ring-1 ring-white/10">
                                        <div className="flex h-16 bg-gray-600 dark:bg-gray-900 px-8">
                                            <button
                                                className="focus:outline-none"
                                                type="button"
                                                onClick={() =>
                                                    setSidebarOpen(false)
                                                }
                                            >
                                                <Bars3Icon
                                                    className="h-6 w-6"
                                                    aria-hidden="true"
                                                    color="white"
                                                />
                                                <span className="sr-only">
                                                    Close sidebar
                                                </span>
                                            </button>
                                        </div>
                                        <div className="px-6">
                                            <div className="flex h-16 gap-y-5 shrink-0 items-center">
                                                <Image
                                                    className="h-16 w-auto"
                                                    src="/lynx-white.png"
                                                    width="1153"
                                                    height="497"
                                                    alt="DeepLynx"
                                                    draggable={false}
                                                />
                                            </div>
                                            <br />
                                            <nav className="flex flex-1 flex-col">
                                                <ul
                                                    role="list"
                                                    className="flex flex-1 flex-col gap-y-7"
                                                >
                                                    <li>
                                                        <div className="text-xs font-semibold leading-6 text-gray-100">
                                                            Data Visualization
                                                        </div>
                                                        <ul
                                                            role="list"
                                                            className="-mx-2 space-y-1"
                                                        >
                                                            {data.map(
                                                                (item) => (
                                                                    <li
                                                                        key={
                                                                            item.name
                                                                        }
                                                                    >
                                                                        <a
                                                                            href={
                                                                                item.href
                                                                            }
                                                                            onClick={() =>
                                                                                setSidebarOpen(
                                                                                    false
                                                                                )
                                                                            }
                                                                            className={classNames(
                                                                                item.current
                                                                                    ? "bg-gray-800 text-white"
                                                                                    : "text-gray-100 hover:text-white hover:bg-gray-700",
                                                                                "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                                                                            )}
                                                                        >
                                                                            <item.icon
                                                                                className="h-6 w-6 shrink-0"
                                                                                aria-hidden="true"
                                                                            />
                                                                            {
                                                                                item.name
                                                                            }
                                                                        </a>
                                                                    </li>
                                                                )
                                                            )}
                                                        </ul>
                                                    </li>
                                                    <li>
                                                        <div className="text-xs font-semibold leading-6 text-gray-100">
                                                            Data Management
                                                        </div>
                                                        <ul
                                                            role="list"
                                                            className="-mx-2 mt-2 space-y-1"
                                                        >
                                                            {dataManagement.map(
                                                                (item) => (
                                                                    <li
                                                                        key={
                                                                            item.name
                                                                        }
                                                                    >
                                                                        <a
                                                                            href={
                                                                                item.href
                                                                            }
                                                                            className={classNames(
                                                                                item.current
                                                                                    ? "bg-gray-800 text-white"
                                                                                    : "text-gray-100 hover:text-white hover:bg-gray-700",
                                                                                "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                                                                            )}
                                                                        >
                                                                            <item.icon
                                                                                className="h-6 w-6 shrink-0"
                                                                                aria-hidden="true"
                                                                            />
                                                                            {
                                                                                item.name
                                                                            }
                                                                        </a>
                                                                    </li>
                                                                )
                                                            )}
                                                        </ul>
                                                    </li>
                                                    <li className="mt-auto">
                                                        <a
                                                            href="#"
                                                            className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-100 hover:bg-gray-800 hover:text-white"
                                                        >
                                                            <Cog6ToothIcon
                                                                className="h-6 w-6 shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                            Settings
                                                        </a>
                                                    </li>
                                                </ul>
                                            </nav>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </Dialog>
                </Transition.Root>

                <div>
                    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-500 bg-white dark:bg-slate-900 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
                        <button
                            type="button"
                            className="-m-2.5 p-2.5"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <span className="sr-only">Open sidebar</span>
                            <Bars3Icon
                                className="h-6 w-6"
                                aria-hidden="true"
                                color="gray-700 dark:white"
                            />
                        </button>

                        {/* Separator */}
                        <div
                            className="h-6 w-px bg-gray-900/50 dark:bg-gray-100/50"
                            aria-hidden="true"
                        />

                        <div className="flex flex-1 gap-x-4 lg:gap-x-6">
                            <form
                                className="relative flex flex-1 justify-start"
                                action="#"
                                method="GET"
                            >
                                <label
                                    htmlFor="search-field"
                                    className="sr-only"
                                >
                                    Search
                                </label>
                                <MagnifyingGlassIcon
                                    className="pointer-events-none absolute inset-y-0 left-2 h-full w-5 text-gray-400"
                                    aria-hidden="true"
                                />
                                <input
                                    id="search-field"
                                    className="block h-full w-full border-gray-300/75 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                                    placeholder="Search"
                                    type="search"
                                    name="search"
                                />
                            </form>

                            <select
                                id="location"
                                name="location"
                                className="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                defaultValue="United States"
                            >
                                <option>Core II</option>
                                <option>Beartooth</option>
                                <option>Container Home</option>
                            </select>

                            <div className="flex items-center gap-x-4 lg:gap-x-6">
                                <button
                                    type="button"
                                    className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
                                >
                                    <span className="sr-only">
                                        View notifications
                                    </span>
                                    <BellIcon
                                        className="h-6 w-6"
                                        aria-hidden="true"
                                    />
                                </button>
                                <DarkModeToggle />

                                {/* Profile dropdown */}
                                <Menu as="div" className="relative">
                                    <Menu.Button className="-m-1.5 flex items-center">
                                        {/* Separator */}
                                        <div
                                            className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10"
                                            aria-hidden="true"
                                        />
                                        <span className="sr-only">
                                            Open user menu
                                        </span>
                                        {/* <img
                                            className="h-8 w-8 rounded-full bg-gray-50"
                                            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                                            alt=""
                                        /> */}
                                        <span className="hidden lg:flex lg:items-center">
                                            <span
                                                className="ml-4 text-sm font-semibold leading-6 text-gray-900 dark:text-white"
                                                aria-hidden="true"
                                            >
                                                Robert C. Martin
                                            </span>
                                            <ChevronDownIcon
                                                className="ml-2 h-5 w-5 text-gray-400"
                                                aria-hidden="true"
                                            />
                                        </span>
                                    </Menu.Button>
                                    <Transition
                                        as={Fragment}
                                        enter="transition ease-out duration-100"
                                        enterFrom="transform opacity-0 scale-95"
                                        enterTo="transform opacity-100 scale-100"
                                        leave="transition ease-in duration-75"
                                        leaveFrom="transform opacity-100 scale-100"
                                        leaveTo="transform opacity-0 scale-95"
                                    >
                                        <Menu.Items className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 ring-1 ring-gray-900/5 focus:outline-none">
                                            {userNavigation.map((item) => (
                                                <Menu.Item key={item.name}>
                                                    {({ active }) => (
                                                        <a
                                                            href={item.href}
                                                            className={classNames(
                                                                active
                                                                    ? "bg-gray-50"
                                                                    : "",
                                                                "block px-3 py-1 text-sm leading-6 text-gray-900"
                                                            )}
                                                        >
                                                            {item.name}
                                                        </a>
                                                    )}
                                                </Menu.Item>
                                            ))}
                                        </Menu.Items>
                                    </Transition>
                                </Menu>
                            </div>
                        </div>
                    </div>

                    <main className="py-10">
                        <div className="px-4 sm:px-6 lg:px-8">
                            {props.children}
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}

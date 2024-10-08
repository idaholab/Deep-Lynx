"use client";

// React
import * as React from "react";

// MUI
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";

// Icons
import { Card } from "@mui/material";

export function Signup() {

  return (
    <>
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-row min-h-96 min-w-48">
          <Card className="p-20 bg-[#083769] rounded-none rounded-l-md flex align-items-center">
            <div className="flex justify-center items-center">
              <img
                src={"/lynx-white.png"}
                width={150}
                height={69}
              />
            </div>
          </Card>
          <Card className="px-10 bg-darkGray flex align-items-center rounded-none rounded-r-md">

            <div className="flex justify-center items-center ">

              <div className="sm:mx-auto sm:w-full sm:max-w-[480px] mb-8">

                <div className="bg-white px-6 py-12">
                  <h2>Signup</h2>
                  <form action="#" method="POST" className="space-y-6">
                  <div>
                      <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                        Full Name
                      </label>
                      <div className="mt-2">
                        <input
                          placeholder="John Doe"
                          id="email"
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                        Email address
                      </label>
                      <div className="mt-2">
                        <input
                        placeholder="johndoe@gmail.com"
                          id="email"
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                        Password
                      </label>
                      <div className="mt-2">
                        <input
                          id="password"
                          name="password"
                          type="password"
                          required
                          autoComplete="current-password"
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                        Confirm Password
                      </label>
                      <div className="mt-2">
                        <input
                          id="password"
                          name="password"
                          type="password"
                          required
                          autoComplete="current-password"
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        />
                      </div>
                    </div>

                    <div className="min-w-96 flex justify-between">
                      <div className="text-sm leading-6">
                        <a href="/login" className="font-semibold text-[#083769] hover:text-[#07519E]">
                         I have an account
                        </a>
                      </div>

                      <div className="text-sm leading-6 flex flex-row-reverse">
                        <a href="#" className="font-semibold text-[#083769] hover:text-[#07519E]">
                          Forgot password?
                        </a>
                      </div>
                    </div>


                  </form>

                  <div>
                    <div className="relative mt-2">
                      <div aria-hidden="true" className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4">
                      <div>
                        <button
                          type="submit"
                          className="flex w-full justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-[#083769] hover:bg-[#07519E]"
                        >
                          Register
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

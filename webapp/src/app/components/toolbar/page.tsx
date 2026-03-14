"use client";
import React from "react";
import Image from "next/image";
import Avatar from "./avatar";
import ScaAccess from "../layout/ScaAccess";

const Toolbar = () => {
  return (
    <div className="h-10 bg-[#161616] border-b border-[#2b2b2c] flex items-center text-white text-xs px-2 w-full flex-none sticky top-0 z-40">
      <div className="flex items-center h-full">
        <div className="flex items-center px-1.5 h-full space-x-2">
          <Image
            src="/assets/dist.png"
            alt="AVACX Logo"
            width={15}
            height={15}
            priority
            className="mr-2"
          />
          <span className="text-white font-medium"></span>
          <span className="text-[#2d2f36]">/</span>
          <ScaAccess />
        </div>
      </div>
      <div className="flex-1 flex justify-center px-4" />
      <div className="flex items-center space-x-2 px-2">
        <Avatar />
      </div>
    </div>
  );
};

export default Toolbar;
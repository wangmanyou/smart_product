import React from 'react';
import RightContent from './RightContent';
import { history } from '@umijs/max';

interface Props {
    [x: string]: any;
}
const HeaderRender: React.FC<Props> = () => {

    return (
        <header className="flex items-center w-full h-[56px]">
            <div
                className="flex justify-center items-center m-0 w-[64px] h-full bg-[#000] shrink-0 cursor-pointer"
                onClick={() => history.push('/')}
            >
                知识管理系统
            </div>
            <div className="relative flex-1 flex justify-end ">
                <div
                    className={`header-write flex items-center justify-center cursor-pointer w-[94px] h-[32px] rounded-md `}
                    
                >
                    ff
                </div>
                {/* <RightContent /> */}
            </div>
        </header>
    );
};
export default HeaderRender;


export default [
    {
        name: '登录',
        path: '/login',
        component: './Login',
        layout: false,
    },
    {
        name: '首页',
        path: '/home',
        component: './Home',
    },
    {
        name: '系统管理',
        value: 'system',
        path: '/system',
        // layout: false,
        routes: [
            {
                path: '/system',
                redirect: '/system/dict',
            },
            {
                name: '目录管理',
                path: '/system/dict',
                component: './System/Dict',
                value: "dict",
            },
            {
                name: '目录创建',
                path: '/system/dict/create',
                component: './System/Dict/Create/index',
                hideInMenu: true,
                value: "add",
            },
            {
                name: '目录详情',
                path: '/system/dict/detail/:id',
                component: './System/Dict/Detail',
                hideInMenu: true,
            },
            {
                name: '目录编辑',
                path: '/system/dict/edit/:id',
                component: './System/Dict/Edit',
                hideInMenu: true,
                value: "edit",
            },
            {
                name: '场景管理',
                path: '/system/scene',
                component: './System/Scene',
                value: "scene",
            },
            {
                name: '场景详情',
                path: '/system/scene/detail/:id',
                component: './System/Scene/Detail',
                hideInMenu: true,
            },
            {
                name: '创建场景',
                path: '/system/scene/create',
                component: './System/Scene/Create',
                hideInMenu: true,
                value: "add",
            },
            {
                name: '复制场景',
                path: '/system/scene/copy',
                component: './System/Scene/Copy',
                hideInMenu: true,
                value: "copy",
            },
            {
                name: '场景编辑',
                path: '/system/scene/edit/:id',
                component: './System/Scene/Edit',
                hideInMenu: true,
                value: "edit",
            },
            {
                name: '用户管理',
                path: '/system/user',
                component: './System/User',
                value: "user",
            },
            // {
            //     name: '角色管理',
            //     path: '/system/role',
            //     component: './System/Role',
            //     value: "role",
            // },
            // {
            //     name: '角色添加',
            //     path: '/system/role/add',
            //     component: './System/Role/Create',
            //     hideInMenu: true,
            // },
        ],
    },
    {
        name: '业务管理',
        path: '/business',
        // layout: false,
        value: "scene",
        routes: [{
            path: '/business',
            redirect: '/business/list',
        }, {
            name: '业务列表',
            path: '/business/list',
            component: './Business/index',
        }, {
            name: '业务详情',
            path: '/business/:id',
            component: './Business/Business',
            hideInMenu: true,
        }, {
            name: '添加',
            path: '/business/:id/create',
            component: './Business/BusinessCreate',
            hideInMenu: true,
            value: 'add',
        }, {
            name: '编辑',
            path: '/business/:id/edit/:knowledgeId',
            component: './Business/BusinessEdit',
            hideInMenu: true,
            value: 'edit',
        }, {
            name: '详情',
            path: '/business/:id/knowledge/:knowledgeId',
            component: './Business/BusinessDetail',
            hideInMenu: true,
        }]
    },
    {
        name: '知识统计',
        path: '/statistics',
        value: "statistics",
        routes: [{
            path: '/statistics',
            redirect: '/statistics/count',

        }, {
            name: '按场景知识数量统计',
            path: '/statistics/count',
            component: './Statistics/Count',
            value: "count",
        }, {
            name: '按场景知识历史点击量统计',
            path: '/statistics/history-click',
            component: './Statistics/HistoryClicks',
            value: "click",
        }, 
        // {
        //     name: '按场景知识点击量统计',
        //     path: '/statistics/click',
        //     component: './Statistics/Clicks',
        // }, 
        {
            name: '按场景知识创建人统计',
            path: '/statistics/creator',
            component: './Statistics/Creators',
            value: "creator",
        },]

    },
    {
        path: '/',
        redirect: '/home',
    },
    { path: '*', layout: false, component: './404' },
];

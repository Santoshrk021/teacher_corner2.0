/* tslint:disable:max-line-length */
import { FuseNavigationItem } from '@fuse/components/navigation';

export const defaultNavigation: FuseNavigationItem[] = [
    // TACtivities
    // {
    //     id: 'TACs',
    //     title: 'My TACtivities',
    //     type: 'basic',
    //     icon: 'heroicons_outline:book-open',
    //     link: '/my-tactivities'
    // },
    // Courses
    {
        id: 'programme1',
        title: 'ThinkTAC',
        type: 'collapsable',
        icon: 'heroicons_outline:library',
        link: '/dashboard',
        active: true,
        children: [
            {
                id: 'programme1',
                title: 'ThinkTAC Demo',
                type: 'basic',
                icon: 'feather:classroom',
                link: 'dashboard',
                queryParams: { id: 'dfghjjhgvc' }
                // active: true,
            },
            {
                id: 'programme2',
                title: 'ThinkTAC Test',
                type: 'basic',
                icon: 'feather:classroom',
                queryParams: { id: 'oijuhgfcdsdfghj' },
                link: 'dashboard',
            }
        ]
    },

    // Tools
    {
        id: 'registration',
        title: 'Tools',
        type: 'basic',
        icon: 'feather:tool',
        link: '/tools',

    },
    // registrations
    {
        id: 'registration',
        title: 'Registration',
        type: 'basic',
        icon: 'mat_outline:app_registration',
        link: '/registration',

    }
];
export const compactNavigation: FuseNavigationItem[] = [
    {
        id: 'example',
        title: 'Example',
        type: 'basic',
        icon: 'heroicons_outline:chart-pie',
        link: '/example'
    }
];
export const futuristicNavigation: FuseNavigationItem[] = [
    {
        id: 'example',
        title: 'Example',
        type: 'basic',
        icon: 'heroicons_outline:chart-pie',
        link: '/example'
    }
];
export const horizontalNavigation: FuseNavigationItem[] = [
    {
        id: 'example',
        title: 'Example',
        type: 'basic',
        icon: 'heroicons_outline:chart-pie',
        link: '/example'
    }
];

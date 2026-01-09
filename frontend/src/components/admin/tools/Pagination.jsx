import { ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight } from 'lucide-react';
 // Pagination component
const Pagination = ({ currentPage, totalPages, totalItems, onPageChange, itemName = 'items', ROWS_PER_PAGE}) => {
if (totalPages <= 1) return null;

const startItem = (currentPage - 1) * ROWS_PER_PAGE + 1;
const endItem = Math.min(currentPage * ROWS_PER_PAGE, totalItems);

// Calculate visible page numbers (max 5 pages shown)
const getVisiblePages = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    
    // Adjust start if we're near the end
    if (end - start < 4) {
    start = Math.max(1, end - 4);
    }
    
    for (let i = start; i <= end; i++) {
    pages.push(i);
    }
    return pages;
};

const visiblePages = getVisiblePages();

return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
    <div className="text-sm text-gray-600">
        Showing <span className="font-semibold text-gray-900">{startItem}</span> to{' '}
        <span className="font-semibold text-gray-900">{endItem}</span> of{' '}
        <span className="font-semibold text-gray-900">{totalItems}</span> {itemName}
    </div>
    
    <div className="flex items-center gap-1">
        {/* First page */}
        <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        title="First page"
        >
        <ChevronsLeft className="w-4 h-4" />
        </button>
        
        {/* Previous page */}
        <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        title="Previous page"
        >
        <ChevronLeft className="w-4 h-4" />
        </button>
        
        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-1">
        {visiblePages[0] > 1 && (
            <>
            <button
                onClick={() => onPageChange(1)}
                className="min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
                1
            </button>
            {visiblePages[0] > 2 && (
                <span className="px-1 text-gray-400">...</span>
            )}
            </>
        )}
        
        {visiblePages.map(page => (
            <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
            >
            {page}
            </button>
        ))}
        
        {visiblePages[visiblePages.length - 1] < totalPages && (
            <>
            {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                <span className="px-1 text-gray-400">...</span>
            )}
            <button
                onClick={() => onPageChange(totalPages)}
                className="min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
                {totalPages}
            </button>
            </>
        )}
        </div>
        
        {/* Next page */}
        <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        title="Next page"
        >
        <ChevronRight className="w-4 h-4" />
        </button>
        
        {/* Last page */}
        <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        title="Last page"
        >
        <ChevronsRight className="w-4 h-4" />
        </button>
    </div>
    </div>
);
};

export default Pagination;
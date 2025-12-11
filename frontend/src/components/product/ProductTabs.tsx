import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ThumbsUp, X, Upload, RefreshCw } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import productApi from '@/lib/api/product';
import { uploadApi } from '@/lib/api/upload';
import { formatDistanceToNow } from 'date-fns';
import { useUser } from '@/lib/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

interface ProductTabsProps {
    productId: string;
    description: string;
}

export default function ProductTabs({ productId, description }: ProductTabsProps) {
    const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'shipping'>('description');
    const [page, setPage] = useState(1);
    const [isWritingReview, setIsWritingReview] = useState(false);
    const [reviewImages, setReviewImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const tabsRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();

    const { data: user } = useUser();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const { data: reviewsData } = useQuery({
        queryKey: ['reviews', productId, page],
        queryFn: () => productApi.getReviews(productId, page)
    });

    const helpfulMutation = useMutation({
        mutationFn: productApi.markReviewHelpful,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
        }
    });

    const createReviewMutation = useMutation({
        mutationFn: productApi.createReview,
        onSuccess: () => {
            showToast('Review submitted successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
            setIsWritingReview(false);
            setReviewImages([]);
        },
        onError: (error: any) => {
            showToast(error.response?.data?.message || 'Failed to submit review', 'error');
        }
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (reviewImages.length + files.length > 5) {
            showToast('Maximum 5 images allowed', 'error');
            return;
        }

        setIsUploading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                const response = await uploadApi.uploadImage(files[i], 'review');
                setReviewImages(prev => [...prev, response.url]);
            }
        } catch (error: any) {
            if (error.isDuplicate && error.existingFile) {
                setReviewImages(prev => [...prev, error.existingFile.url]);
                showToast('Image already uploaded', 'success');
            } else {
                showToast('Failed to upload image', 'error');
            }
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = (index: number) => {
        setReviewImages(prev => prev.filter((_, i) => i !== index));
    };

    const tabs = [
        { id: 'description', label: 'Description' },
        { id: 'reviews', label: `Reviews (${reviewsData?.total || 0})` },
        { id: 'shipping', label: 'Shipping' }
    ];

    // Mobile layout
    if (isMobile) {
        return (
            <div className="mt-8 border-t border-zinc-800 pt-6">
                {/* Scrollable Tab Headers */}
                <div
                    ref={tabsRef}
                    className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-white text-black'
                                : 'bg-zinc-800 text-zinc-400 active:bg-zinc-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="py-4">
                    <AnimatePresence mode="wait">
                        {activeTab === 'description' && (
                            <motion.div
                                key="description"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="prose prose-invert prose-sm max-w-none text-zinc-400"
                            >
                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }} />
                            </motion.div>
                        )}

                        {activeTab === 'reviews' && (
                            <motion.div
                                key="reviews"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-6"
                            >
                                {/* Stats & Write Button */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex text-yellow-400">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={14} fill={i < Math.round(reviewsData?.stats?.average || 0) ? "currentColor" : "none"} />
                                            ))}
                                        </div>
                                        <span className="text-sm text-zinc-400">{reviewsData?.total || 0} reviews</span>
                                    </div>
                                    {!isWritingReview && (
                                        <button
                                            onClick={() => {
                                                if (!user) {
                                                    showToast('Please login to write a review', 'error');
                                                    return;
                                                }
                                                setIsWritingReview(true);
                                            }}
                                            className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg"
                                        >
                                            Write Review
                                        </button>
                                    )}
                                </div>

                                {/* Write Review Form */}
                                <AnimatePresence>
                                    {isWritingReview && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl relative">
                                                <button
                                                    onClick={() => setIsWritingReview(false)}
                                                    className="absolute top-4 right-4 text-zinc-500"
                                                >
                                                    <X size={20} />
                                                </button>

                                                <h3 className="text-base font-bold text-white mb-4">Write a Review</h3>

                                                <form
                                                    onSubmit={(e) => {
                                                        e.preventDefault();
                                                        const formData = new FormData(e.currentTarget);
                                                        const rating = Number(formData.get('rating') || 5);
                                                        const title = formData.get('title') as string;
                                                        const content = formData.get('content') as string;

                                                        createReviewMutation.mutate({
                                                            productId,
                                                            rating,
                                                            title,
                                                            content,
                                                            images: reviewImages
                                                        });
                                                    }}
                                                    className="space-y-4"
                                                >
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <label className="text-xs text-zinc-400 mb-1 block">Rating</label>
                                                            <select
                                                                name="rating"
                                                                defaultValue="5"
                                                                className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 rounded-lg"
                                                            >
                                                                {[5, 4, 3, 2, 1].map(n => (
                                                                    <option key={n} value={n}>{n} Stars</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-xs text-zinc-400 mb-1 block">Title</label>
                                                            <input
                                                                type="text"
                                                                name="title"
                                                                required
                                                                className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 rounded-lg"
                                                                placeholder="Summary"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-xs text-zinc-400 mb-1 block">Review</label>
                                                        <textarea
                                                            name="content"
                                                            required
                                                            rows={3}
                                                            className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 rounded-lg resize-none"
                                                            placeholder="Share your thoughts..."
                                                        />
                                                    </div>

                                                    {/* Image Upload */}
                                                    <div className="flex gap-2 flex-wrap">
                                                        {reviewImages.map((url, index) => (
                                                            <div key={index} className="relative w-14 h-14">
                                                                <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeImage(index)}
                                                                    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5"
                                                                >
                                                                    <X size={10} className="text-white" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {reviewImages.length < 5 && (
                                                            <label className="w-14 h-14 border border-dashed border-zinc-600 rounded-lg flex items-center justify-center">
                                                                {isUploading ? (
                                                                    <RefreshCw size={16} className="text-zinc-500 animate-spin" />
                                                                ) : (
                                                                    <Upload size={16} className="text-zinc-500" />
                                                                )}
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    multiple
                                                                    className="hidden"
                                                                    onChange={handleImageUpload}
                                                                    disabled={isUploading}
                                                                />
                                                            </label>
                                                        )}
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        disabled={createReviewMutation.isPending}
                                                        className="w-full py-3 bg-white text-black font-bold rounded-lg disabled:opacity-50"
                                                    >
                                                        {createReviewMutation.isPending ? 'Submitting...' : 'Submit'}
                                                    </button>
                                                </form>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Review List */}
                                {reviewsData?.reviews.length === 0 ? (
                                    <div className="text-center py-8 border border-dashed border-zinc-800 rounded-xl">
                                        <p className="text-zinc-500 mb-4">No reviews yet</p>
                                        {!isWritingReview && (
                                            <button
                                                onClick={() => {
                                                    if (!user) {
                                                        showToast('Please login to write a review', 'error');
                                                        return;
                                                    }
                                                    setIsWritingReview(true);
                                                }}
                                                className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg"
                                            >
                                                Write the first review
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {reviewsData?.reviews.map((review) => (
                                            <div key={review.id} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-sm font-bold text-zinc-500">
                                                            {review.authorName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-white">{review.authorName}</h4>
                                                            <div className="flex text-yellow-400">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star key={i} size={10} fill={i < review.rating ? "currentColor" : "none"} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-zinc-600">
                                                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                                                    </span>
                                                </div>

                                                <h5 className="font-medium text-white text-sm mb-1">{review.title}</h5>
                                                <p className="text-zinc-400 text-sm leading-relaxed">{review.content}</p>

                                                {review.images && review.images.length > 0 && (
                                                    <div className="flex gap-2 mt-3">
                                                        {review.images.map((img, idx) => (
                                                            <img
                                                                key={idx}
                                                                src={img}
                                                                alt=""
                                                                className="w-12 h-12 object-cover rounded-lg"
                                                                onClick={() => window.open(img, '_blank')}
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => {
                                                        if (!user) showToast('Login to vote', 'error');
                                                        else helpfulMutation.mutate(review.id);
                                                    }}
                                                    className="flex items-center gap-1 text-xs text-zinc-500 mt-3"
                                                >
                                                    <ThumbsUp size={12} />
                                                    Helpful ({review.helpfulCount})
                                                </button>
                                            </div>
                                        ))}

                                        {reviewsData && reviewsData.pages > 1 && (
                                            <div className="flex justify-center gap-2 pt-4">
                                                {[...Array(reviewsData.pages)].map((_, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setPage(i + 1)}
                                                        className={`w-8 h-8 rounded-lg text-sm ${i + 1 === page ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'
                                                            }`}
                                                    >
                                                        {i + 1}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'shipping' && (
                            <motion.div
                                key="shipping"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-zinc-400 text-sm space-y-4"
                            >
                                <div>
                                    <h3 className="text-white font-bold mb-2">Shipping</h3>
                                    <p>We offer worldwide shipping. Orders are processed within 1-2 business days.</p>
                                    <ul className="list-disc ml-4 mt-2 space-y-1">
                                        <li>Standard: 5-7 business days</li>
                                        <li>Express: 2-3 business days</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-white font-bold mb-2">Returns</h3>
                                    <p>Returns accepted within 30 days. Items must be unworn and in original packaging.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    // Desktop layout (original)
    return (
        <div className="mt-20">
            <div className="flex border-b border-[#27272a]">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-8 py-4 text-sm font-bold uppercase tracking-widest font-mono transition-colors relative ${activeTab === tab.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                        )}
                    </button>
                ))}
            </div>

            <div className="py-12">
                <AnimatePresence mode="wait">
                    {activeTab === 'description' && (
                        <motion.div key="description" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="prose prose-invert max-w-none text-zinc-400">
                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }} />
                        </motion.div>
                    )}

                    {activeTab === 'reviews' && (
                        <motion.div key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Customer Reviews</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex text-yellow-400">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={16} fill={i < Math.round(reviewsData?.stats?.average || 0) ? "currentColor" : "none"} />
                                            ))}
                                        </div>
                                        <span className="text-zinc-400 text-sm">Based on {reviewsData?.total || 0} reviews</span>
                                    </div>
                                </div>
                                {!isWritingReview && (
                                    <button onClick={() => { if (!user) { showToast('Please login to write a review', 'error'); return; } setIsWritingReview(true); }} className="bg-white text-black font-bold uppercase tracking-widest px-6 py-3 rounded-sm hover:bg-zinc-200 transition-colors">
                                        Write a Review
                                    </button>
                                )}
                            </div>

                            <AnimatePresence>
                                {isWritingReview && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                        <div className="bg-[#0A0A0A] border border-[#27272a] p-8 rounded-sm relative">
                                            <button onClick={() => setIsWritingReview(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20} /></button>
                                            <h3 className="text-lg font-bold text-white uppercase tracking-widest mb-6">Write a Review</h3>
                                            <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); createReviewMutation.mutate({ productId, rating: Number(formData.get('rating') || 5), title: formData.get('title') as string, content: formData.get('content') as string, images: reviewImages }); }} className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs text-zinc-400 uppercase tracking-widest font-mono">Rating</label>
                                                    <div className="flex gap-2">
                                                        <input type="number" name="rating" min="1" max="5" defaultValue="5" className="bg-[#050505] border border-[#27272a] text-white px-4 py-2 w-20" />
                                                        <span className="text-zinc-500 text-sm self-center">Stars</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-xs text-zinc-400 uppercase tracking-widest font-mono">Title</label>
                                                        <input type="text" name="title" required className="w-full bg-[#050505] border border-[#27272a] text-white px-4 py-3 rounded-sm focus:border-white outline-none" placeholder="Summarize your experience" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs text-zinc-400 uppercase tracking-widest font-mono">Name</label>
                                                        <input type="text" name="authorName" defaultValue={`${user?.firstName} ${user?.lastName}`} required className="w-full bg-[#050505] border border-[#27272a] text-white px-4 py-3 rounded-sm focus:border-white outline-none" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs text-zinc-400 uppercase tracking-widest font-mono">Review</label>
                                                    <textarea name="content" required rows={4} className="w-full bg-[#050505] border border-[#27272a] text-white px-4 py-3 rounded-sm focus:border-white outline-none resize-none" placeholder="Share your thoughts about this product..." />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs text-zinc-400 uppercase tracking-widest font-mono">Photos (Optional)</label>
                                                    <div className="flex flex-wrap gap-4">
                                                        {reviewImages.map((url, index) => (
                                                            <div key={index} className="relative w-20 h-20 group">
                                                                <img src={url} alt="" className="w-full h-full object-cover rounded-sm border border-[#27272a]" />
                                                                <button type="button" onClick={() => removeImage(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                                            </div>
                                                        ))}
                                                        {reviewImages.length < 5 && (
                                                            <label className="w-20 h-20 border border-dashed border-zinc-700 rounded-sm flex flex-col items-center justify-center cursor-pointer hover:border-white hover:bg-zinc-900 transition-colors">
                                                                {isUploading ? <RefreshCw size={20} className="text-zinc-500 animate-spin" /> : <><Upload size={20} className="text-zinc-500 mb-1" /><span className="text-[9px] text-zinc-500 uppercase font-bold">Add</span></>}
                                                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex justify-end pt-4">
                                                    <button type="submit" disabled={createReviewMutation.isPending || isUploading} className="bg-white text-black font-bold uppercase tracking-widest px-8 py-3 rounded-sm hover:bg-zinc-200 transition-colors disabled:opacity-50">
                                                        {createReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {reviewsData?.reviews.length === 0 ? (
                                <div className="text-center py-12 border border-[#27272a] border-dashed">
                                    <p className="text-zinc-500 mb-4">No reviews yet.</p>
                                    {!isWritingReview && <button onClick={() => { if (!user) { showToast('Please login to write a review', 'error'); return; } setIsWritingReview(true); }} className="px-6 py-2 bg-white text-black font-bold uppercase tracking-wide hover:bg-zinc-200 transition-colors">Write the first review</button>}
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="grid gap-6">
                                        {reviewsData?.reviews.map((review) => (
                                            <div key={review.id} className="border border-[#27272a] p-6 bg-zinc-900/20">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-zinc-500 uppercase">{review.authorName.charAt(0)}</div>
                                                        <div>
                                                            <h4 className="font-bold text-white text-sm">{review.authorName}</h4>
                                                            <div className="flex text-yellow-400 text-xs mt-0.5">{[...Array(5)].map((_, i) => <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-zinc-700"} />)}</div>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-zinc-600 font-mono">{formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}</span>
                                                </div>
                                                <h5 className="font-bold text-white mb-2">{review.title}</h5>
                                                <p className="text-zinc-400 text-sm leading-relaxed mb-4">{review.content}</p>
                                                {review.images && review.images.length > 0 && (
                                                    <div className="flex gap-2 mb-4">{review.images.map((img, idx) => <img key={idx} src={img} alt="" className="w-16 h-16 object-cover rounded-sm border border-[#27272a] cursor-pointer hover:opacity-80" onClick={() => window.open(img, '_blank')} />)}</div>
                                                )}
                                                <button onClick={() => { if (!user) showToast('Login to vote', 'error'); else helpfulMutation.mutate(review.id); }} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors"><ThumbsUp size={14} />Helpful ({review.helpfulCount})</button>
                                            </div>
                                        ))}
                                    </div>
                                    {reviewsData && reviewsData.pages > 1 && (
                                        <div className="flex justify-center gap-2 pt-8">{[...Array(reviewsData.pages)].map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 flex items-center justify-center border text-xs font-mono ${i + 1 === page ? 'border-white bg-white text-black' : 'border-[#27272a] text-zinc-500 hover:border-zinc-500'}`}>{i + 1}</button>)}</div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'shipping' && (
                        <motion.div key="shipping" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-zinc-400 space-y-4">
                            <h3 className="text-white font-bold uppercase tracking-wide">Shipping Policy</h3>
                            <p>We offer worldwide shipping. Orders are processed within 1-2 business days.</p>
                            <ul className="list-disc list-inside space-y-2 ml-4"><li>Standard Shipping (5-7 business days)</li><li>Express Shipping (2-3 business days)</li></ul>
                            <h3 className="text-white font-bold uppercase tracking-wide mt-8">Return Policy</h3>
                            <p>Returns are accepted within 30 days of purchase. Items must be unworn and in original packaging.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

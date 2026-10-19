import React, { useState, useEffect } from 'react';
import {
  Star,
  Plus,
  CheckCircle2,
  X,
  Send,
  Loader2,
  Sparkles,
  Quote,
  GraduationCap,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { Review } from '../types/index.ts';

interface ReviewsPageProps {
  onNavigate?: (path: string) => void;
  onOpenAuth?: (mode?: 'login' | 'signup') => void;
}

export const ReviewsPage: React.FC<ReviewsPageProps> = ({ onNavigate, onOpenAuth }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterRole, setFilterRole] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    author_name: '',
    institution: '',
    role: 'Student',
    overall_rating: 5,
    comment: '',
  });

  // Fetch reviews from API / DB on mount
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        const res = await api.getReviews();
        if (res && Array.isArray(res.reviews)) {
          setReviews(res.reviews);
        } else {
          setReviews([]);
        }
      } catch (err) {
        console.warn('[ReviewsPage] Could not load live reviews:', err);
        setReviews([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, []);

  const handleOpenModal = () => {
    setSubmitError('');
    setSubmitSuccess(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSubmitError('');
    setSubmitSuccess(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!formData.author_name.trim() || formData.author_name.trim().length < 2) {
      setSubmitError('Please enter your name.');
      return;
    }
    if (!formData.institution.trim() || formData.institution.trim().length < 2) {
      setSubmitError('Please enter your college or institution.');
      return;
    }
    if (!formData.comment.trim() || formData.comment.trim().length < 5) {
      setSubmitError('Please write a brief review comment.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newReviewPayload: Partial<Review> = {
        author_name: formData.author_name.trim(),
        institution: formData.institution.trim(),
        role: formData.role,
        overall_rating: formData.overall_rating,
        rating_fairness: formData.overall_rating,
        rating_relevance: formData.overall_rating,
        rating_ui: formData.overall_rating,
        comment: formData.comment.trim(),
        lab_subject: 'General Assessment',
        avg_lab_score: 85,
        students_evaluated: 50,
      };

      const res = await api.submitReview(newReviewPayload);
      const createdReview = res?.review || {
        id: `rev_${Date.now()}`,
        ...newReviewPayload,
        created_at: new Date().toISOString(),
      };

      // Optimistically append to state
      setReviews((prev) => [createdReview, ...prev]);
      setSubmitSuccess(true);

      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(false);
        setFormData({
          author_name: '',
          institution: '',
          role: 'Student',
          overall_rating: 5,
          comment: '',
        });
      }, 1200);
    } catch (err: any) {
      console.error('[ReviewsPage] Submit review error:', err);
      setSubmitError(err?.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered reviews for grid
  const filteredReviews = reviews.filter((rev) => {
    if (filterRole === 'all') return true;
    if (filterRole === 'faculty') return rev.role.toLowerCase().includes('faculty') || rev.role.toLowerCase().includes('prof') || rev.role.toLowerCase().includes('evaluator');
    if (filterRole === 'student') return rev.role.toLowerCase().includes('student') || rev.role.toLowerCase().includes('scholar');
    if (filterRole === 'admin') return rev.role.toLowerCase().includes('admin');
    return true;
  });

  // Duplicate for seamless infinite marquee loop
  const marqueeReviews = [...reviews, ...reviews];

  return (
    <div className="syntaxviva-landing min-h-screen text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Ambient background glow and grid */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute w-[800px] h-[500px] rounded-full bg-emerald-500/[.04] blur-[150px] -top-32 left-1/2 -translate-x-1/2" />
        <div className="absolute w-[600px] h-[400px] rounded-full bg-cyan-500/[.03] blur-[140px] top-[40%] right-[-100px]" />
        <div className="absolute inset-0 grid-bg opacity-35" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 pt-32 pb-24">
        {/* ===================================================================
            HEADER: Minimalist title + clean subtext + Add Review button
        =================================================================== */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[.07] px-4 py-1.5 mb-5 backdrop-blur-md shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-300">
              Verified User Feedback
            </span>
          </div>

          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-[-.035em] text-white leading-[1.1] mb-5">
            User & Faculty Reviews
          </h1>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto mb-8">
            See what students, professors, and lab administrators say about assessing and proving code comprehension with SyntaXViva.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 text-sm font-semibold shadow-lg shadow-emerald-950/40 transition hover:shadow-emerald-900/60 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Review
            </button>

            {onOpenAuth && (
              <button
                onClick={() => onOpenAuth('signup')}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] hover:bg-white/[.08] text-slate-200 px-6 py-3 text-sm font-medium transition cursor-pointer backdrop-blur-md"
              >
                Experience Platform
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </button>
            )}
          </div>
        </div>

        {/* ===================================================================
            SECTION 1: INFINITE HORIZONTAL MARQUEE CAROUSEL (WHEN REVIEWS EXIST)
        =================================================================== */}
        {reviews.length > 0 && (
          <div className="mb-20 overflow-hidden relative">
            {/* Edge blur fade gradients */}
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#090D14] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#090D14] to-transparent z-10 pointer-events-none" />

            <div className="flex gap-6 w-max animate-marquee hover:[animation-play-state:paused] py-3">
              {marqueeReviews.map((rev, idx) => (
                <div
                  key={`${rev.id}-${idx}`}
                  className="w-[340px] sm:w-[380px] shrink-0 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-emerald-500/40 transition backdrop-blur-xl flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Bar: Reviewer Name + Stars */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
                          {rev.author_name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{rev.institution}</span>
                        </p>
                      </div>

                      {/* 5 Stars Visual */}
                      <div className="flex items-center gap-1 text-amber-400 shrink-0 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < (rev.overall_rating || 5)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Review Text */}
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic line-clamp-4 mt-3">
                      "{rev.comment}"
                    </p>
                  </div>

                  {/* Bottom Verified Badge */}
                  <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified User
                    </span>
                    <span className="text-slate-500">{rev.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 2: RESPONSIVE REVIEW CARD GRID WITH ROLE FILTERS
        =================================================================== */}
        <div>
          {/* Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Quote className="w-5 h-5 text-emerald-400" />
                All Community Feedback
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Showing {filteredReviews.length} verified experiences
              </p>
            </div>

            {reviews.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all', label: 'All Reviews' },
                  { id: 'faculty', label: 'Faculty' },
                  { id: 'student', label: 'Students' },
                  { id: 'admin', label: 'Lab Admins' },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setFilterRole(filter.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer border ${
                      filterRole === filter.id
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cards Grid or Empty State */}
          {reviews.length === 0 ? (
            <div className="text-center py-20 px-6 rounded-3xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-xl max-w-xl mx-auto shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
                <Quote className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Reviews Yet</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto mb-7 leading-relaxed">
                Be the first professor, student, or lab administrator to share your experience with SyntaXViva.
              </p>
              <button
                onClick={handleOpenModal}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 text-sm font-semibold shadow-lg shadow-emerald-950/40 transition hover:shadow-emerald-900/60 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Write First Review
              </button>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl border border-slate-800/80 bg-slate-900/30 backdrop-blur-md max-w-md mx-auto">
              <p className="text-sm text-slate-400">
                No reviews match the selected filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-emerald-500/40 transition backdrop-blur-xl flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Bar */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                          {rev.author_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                            {rev.author_name}
                          </h3>
                          <p className="text-xs text-slate-400 truncate max-w-[170px]">
                            {rev.institution}
                          </p>
                        </div>
                      </div>

                      {/* Star Rating Visual */}
                      <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < (rev.overall_rating || 5)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Review Text */}
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic mt-4">
                      "{rev.comment}"
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified Review
                    </span>
                    <span className="text-slate-500 font-mono text-[10px]">{rev.role}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================
          SIMPLE "ADD REVIEW" MODAL
      =================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0c121e] p-6 sm:p-8 shadow-2xl text-slate-100">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Community Voice
              </div>
              <h2 className="text-xl font-bold text-white">Share Your Review</h2>
              <p className="text-xs text-slate-400 mt-1">
                Tell us about your experience using SyntaXViva for computer science assessments.
              </p>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Thank You for Your Review!</h3>
                <p className="text-xs text-slate-400">
                  Your feedback has been saved and added to the community wall.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {submitError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                    {submitError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.author_name}
                    onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                    placeholder="e.g. Dr. Alex Mercer or Aarav Patel"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    College / Institution *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="e.g. Stanford University or MIT Computer Science"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-emerald-500 transition"
                    >
                      <option value="Student">Student</option>
                      <option value="Faculty & Evaluator">Faculty & Evaluator</option>
                      <option value="Lab Administrator">Lab Administrator</option>
                      <option value="Department Head">Department Head</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Rating (1 - 5 Stars)
                    </label>
                    <div className="flex items-center gap-1.5 py-2 px-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormData({ ...formData, overall_rating: star })}
                          className="cursor-pointer transition hover:scale-110"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= formData.overall_rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Review *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    placeholder="Describe how SyntaXViva helped in your lab assignments or viva evaluations..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 text-xs font-semibold shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Submit Review
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useUserCredits } from '@/hooks/use-user-credits';
import { postJob } from '@/app/actions/jobs';
import { createCheckoutSession } from '@/app/actions/checkout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { JOB_CATEGORIES } from '@/lib/jobs/remotive';
import { cn } from '@/lib/utils';

export function EmployerDashboard() {
  const { user, firestore } = useFirebase();
  const { credits, isLoading: creditsLoading } = useUserCredits();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBuying, setIsBuying] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('Software Development');
  const [jobType, setJobType] = useState('full_time');
  const [location, setLocation] = useState('Worldwide');
  const [salary, setSalary] = useState('');
  const [applyUrl, setApplyUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'), orderBy('credit_amount', 'asc'));
  }, [firestore]);

  const { data: creditPacks, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <h1 className="font-display text-3xl font-semibold mb-3">Hire on Outpost</h1>
        <p className="text-muted-foreground mb-6">
          Sign in to post remote roles. Seekers browse free — employers pay per post.
        </p>
        <Button onClick={() => router.push('/login')}>Sign in to post</Button>
      </div>
    );
  }

  const handlePurchase = async (priceId: string) => {
    setIsBuying(priceId);
    try {
      await createCheckoutSession({ userId: user.uid, priceId });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Checkout error',
        description: 'Could not start purchase. Try again.',
      });
    } finally {
      setIsBuying(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((credits ?? 0) < 1) {
      toast({
        variant: 'destructive',
        title: 'No posting credits',
        description: 'Buy a posting pack below to publish this role.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await postJob({
        userId: user.uid,
        title,
        companyName,
        category,
        jobType: jobType as any,
        location,
        salary: salary || null,
        applyUrl,
        description,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 12),
      });
      toast({ title: 'Job published', description: 'Your role is live on Outpost.' });
      router.push(`/jobs/${result.jobId}`);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Could not publish',
        description: err.message || 'Something went wrong.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          Employer outpost
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Post remote roles to the Outpost board. Each publish spends 1 posting credit.
        </p>
        <p className="mt-3 text-sm">
          Balance:{' '}
          <span className="font-semibold text-primary">
            {creditsLoading ? '…' : `${credits ?? 0} credits`}
          </span>
        </p>
      </div>

      {(credits ?? 0) < 1 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="font-display">Get posting credits</CardTitle>
            <CardDescription>
              Seekers browse free. Employers buy credits to publish roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(creditPacks || []).map((pack) => {
                  const highlight = Boolean(pack.display_tag);
                  return (
                    <Card
                      key={pack.stripe_price_id}
                      className={cn(
                        'relative flex flex-col',
                        highlight && 'border-primary shadow-lg shadow-primary/10'
                      )}
                    >
                      {pack.display_tag && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                          {pack.display_tag}
                        </Badge>
                      )}
                      <CardHeader className="text-center pt-8 pb-2">
                        <CardTitle className="text-base">{pack.name}</CardTitle>
                        <CardDescription>{pack.credit_amount} posts</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center gap-3">
                        <p className="text-3xl font-display font-semibold">${pack.price_usd}</p>
                        <Button
                          className="w-full"
                          disabled={isBuying === pack.stripe_price_id}
                          onClick={() => handlePurchase(pack.stripe_price_id)}
                        >
                          {isBuying === pack.stripe_price_id && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Buy
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
                {(!creditPacks || creditPacks.length === 0) && (
                  <p className="text-sm text-muted-foreground col-span-full">
                    No posting packs configured yet. Add products in Firestore to enable checkout.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Post a remote job</CardTitle>
          <CardDescription>1 credit publishes one active listing.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full time</SelectItem>
                    <SelectItem value="part_time">Part time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Remote location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Worldwide"
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary">Salary (optional)</Label>
                <Input
                  id="salary"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="$120k – $150k"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="applyUrl">Apply URL</Label>
                <Input
                  id="applyUrl"
                  type="url"
                  value={applyUrl}
                  onChange={(e) => setApplyUrl(e.target.value)}
                  placeholder="https://"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="react, typescript, remote"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={10}
                required
                placeholder="Role overview, responsibilities, requirements…"
              />
            </div>

            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish job
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

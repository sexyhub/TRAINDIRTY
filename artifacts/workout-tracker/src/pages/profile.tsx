import { useGetProfile, useUpdateProfile } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { User, Save, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { cn } from "@/components/layout";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  weight: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  fitnessGoal: z.string().optional(),
  unit: z.enum(["kg", "lbs"])
});

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user: authUser, logout } = useAuth();
  const { data: profile, isLoading } = useGetProfile();
  
  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/profile"] })
    }
  });

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      unit: "kg",
      weight: 0,
      height: 0,
      fitnessGoal: ""
    }
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name,
        weight: profile.weight || undefined,
        height: profile.height || undefined,
        fitnessGoal: profile.fitnessGoal || "",
        unit: profile.unit
      });
    }
  }, [profile, form]);

  const onSubmit = (data: z.infer<typeof profileSchema>) => {
    updateProfile.mutate({ data });
  };

  if (isLoading) return <div className="p-6 pt-12 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 pt-12 space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center border border-border overflow-hidden">
          {authUser?.profileImageUrl ? (
            <img src={authUser.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold uppercase">{profile?.name || authUser?.firstName || 'Athlete'}</h1>
          <p className="text-muted-foreground text-sm tracking-widest uppercase">Member</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4 bg-card border border-border p-5 rounded-3xl">
          <h2 className="font-display font-bold tracking-widest text-sm mb-4">PERSONAL DETAILS</h2>
          
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Display Name</label>
            <input 
              {...form.register("name")}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Weight</label>
              <div className="relative">
                <input 
                  type="number"
                  {...form.register("weight")}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-primary transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{form.watch('unit')}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Unit</label>
              <select 
                {...form.register("unit")}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-primary transition-colors appearance-none"
              >
                <option value="kg">KG</option>
                <option value="lbs">LBS</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Fitness Goal</label>
            <input 
              {...form.register("fitnessGoal")}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={updateProfile.isPending}
          className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          {updateProfile.isPending ? "SAVING..." : "SAVE CHANGES"} <Save className="w-5 h-5" />
        </button>
      </form>

      <button
        onClick={() => logout()}
        className="w-full py-4 text-destructive font-bold flex items-center justify-center gap-2 bg-destructive/10 rounded-xl hover:bg-destructive/20 transition-colors"
      >
        LOG OUT <LogOut className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Film, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "خطأ في تسجيل الدخول", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    // Check admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "خطأ", description: "لم يتم العثور على المستخدم", variant: "destructive" });
      setLoading(false);
      return;
    }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles as any[])?.some((r) => r.role === "admin");
    if (!isAdmin) {
      await supabase.auth.signOut();
      toast({ title: "غير مصرح", description: "ليس لديك صلاحية الأدمن", variant: "destructive" });
      setLoading(false);
      return;
    }
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
      </div>
      <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl neon-border p-8">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 neon-border">
            <Film size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground neon-text">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground">سجل دخولك للمتابعة</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="glass border-border/50 text-foreground"
            dir="ltr"
          />
          <Input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="glass border-border/50 text-foreground"
            dir="ltr"
          />
          <Button type="submit" disabled={loading} className="w-full gap-2">
            <LogIn size={18} />
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;

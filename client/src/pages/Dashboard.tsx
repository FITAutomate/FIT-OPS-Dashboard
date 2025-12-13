import { useQuery } from "@tanstack/react-query";
import { airtableService } from "@/services/airtable_service";
import { hubspotService } from "@/services/hubspot_service";
import { outlookService } from "@/services/outlook_service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Users, ArrowRight, Clock, MoreHorizontal, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

/**
 * Animation variants for the container to stagger children entry.
 */
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

/**
 * Animation variants for individual dashboard items (slide up + fade in).
 */
const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

/**
 * Dashboard Page Component
 * 
 * The main landing view of the CRM. Aggregates data from multiple services:
 * - KPIs (Total Pipeline, Active Clients)
 * - Recent Deals List (HubSpot)
 * - Upcoming Events Widget (Outlook)
 * - Recent Companies Grid (Airtable)
 * 
 * Uses TanStack Query for data fetching and caching.
 */
export default function Dashboard() {
  const { data: companies } = useQuery({ queryKey: ['companies'], queryFn: airtableService.getCompanies });
  const { data: deals } = useQuery({ queryKey: ['deals'], queryFn: hubspotService.getDeals });
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: outlookService.getCalendarEvents });

  // Calculate KPIs
  const totalPipelineValue = deals?.reduce((sum, deal) => sum + deal.amount, 0) || 0;
  const activeClients = companies?.filter(c => c.status === "Active Client").length || 0;
  const upcomingEvents = events?.filter(e => new Date(e.start) > new Date()).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).slice(0, 3) || [];

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Welcome back, John</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening across your workspace today.</p>
        </div>
        <Button className="bg-linear-to-r from-primary to-[#0060B9] hover:from-[#0060B9] hover:to-primary text-white rounded-full px-6 shadow-lg shadow-primary/25 transition-all hover:scale-105 cursor-pointer">
          Create New Deal
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={item}>
          <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-linear-to-br from-primary/10 to-transparent overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary font-heading">
                ${totalPipelineValue.toLocaleString()}
              </div>
              <div className="flex items-center mt-2 text-sm text-green-600 font-medium">
                <TrendingUp className="w-4 h-4 mr-1" />
                +12% from last month
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white overflow-hidden relative">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground font-heading">
                {activeClients}
              </div>
              <div className="flex items-center mt-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4 mr-1" />
                Across 4 regions
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white overflow-hidden relative">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Deals Closing Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-accent font-heading">
                {deals?.filter(d => new Date(d.closeDate) < new Date(Date.now() + 86400000 * 30)).length || 0}
              </div>
              <div className="flex items-center mt-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-1" />
                Next 30 days
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Active Deals */}
        <motion.div variants={item} className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Active Deals
            </h2>
            <Button variant="ghost" className="text-primary hover:text-primary/80 text-sm font-medium cursor-pointer">View All</Button>
          </div>

          <Card className="border-none shadow-md bg-white overflow-hidden">
            <div className="divide-y divide-border/50">
              {deals?.slice(0, 5).map((deal) => (
                <div key={deal.id} className="p-4 hover:bg-secondary/20 transition-colors flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{deal.name}</h3>
                      <p className="text-sm text-muted-foreground">Closing {format(new Date(deal.closeDate), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <Badge variant="outline" className={`
                      ${deal.stage === 'Closed Won' ? 'bg-green-100 text-green-700 border-green-200' : 
                        deal.stage === 'Proposal' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                        'bg-gray-100 text-gray-700 border-gray-200'}
                    `}>
                      {deal.stage}
                    </Badge>
                    <span className="font-bold text-foreground w-24 text-right">${deal.amount.toLocaleString()}</span>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Sidebar Widget - Upcoming Events */}
        <motion.div variants={item} className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Upcoming Events
            </h2>
          </div>

          <Card className="border-none shadow-md bg-white overflow-hidden h-full">
            <CardHeader className="bg-secondary/30 pb-4 border-b border-border/50">
              <CardDescription>Powered by Outlook 365</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingEvents.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="p-4 hover:bg-secondary/20 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center min-w-[3rem] bg-accent/10 rounded-lg p-2 text-accent">
                          <span className="text-xs font-bold uppercase">{format(new Date(event.start), "MMM")}</span>
                          <span className="text-lg font-bold">{format(new Date(event.start), "d")}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm line-clamp-1">{event.subject}</h4>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(event.start), "h:mm a")} - {format(new Date(event.end), "h:mm a")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{event.location}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No upcoming events
                </div>
              )}
              <div className="p-4 border-t border-border/50">
                <Button variant="outline" className="w-full text-xs h-8 cursor-pointer">View Full Calendar</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Companies Row */}
      <motion.div variants={item} className="space-y-6">
        <h2 className="text-xl font-heading font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-sidebar" />
          Recent Companies
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {companies?.slice(0, 4).map((company) => (
            <Card key={company.id} className="border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white group cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden">
                    <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />
                  </div>
                  <Badge variant="secondary" className="text-xs font-normal bg-secondary text-secondary-foreground">
                    {company.status}
                  </Badge>
                </div>
                <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{company.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{company.industry}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
                  <span>{company.country}</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
